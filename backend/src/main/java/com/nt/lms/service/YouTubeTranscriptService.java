package com.nt.lms.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Duration;
import java.net.URI;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Service;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.HtmlUtils;
import org.springframework.web.util.UriComponentsBuilder;

@Service
@RequiredArgsConstructor
@Slf4j
public class YouTubeTranscriptService {

    private static final int STORED_TRANSCRIPT_LIMIT = 12000;
    private static final Pattern WATCH_ID_PATTERN = Pattern.compile("[?&]v=([A-Za-z0-9_-]{6,})");
    private static final Pattern SHORT_URL_PATTERN = Pattern.compile("youtu\\.be/([A-Za-z0-9_-]{6,})");
    private static final Pattern PATH_ID_PATTERN = Pattern.compile("youtube\\.com/(?:embed|shorts)/([A-Za-z0-9_-]{6,})");

    private final ObjectMapper objectMapper;

    @Value("${transcript-api.api-key:}")
    private String transcriptApiKey;

    @Value("${transcript-api.base-url:https://transcriptapi.com}")
    private String transcriptApiBaseUrl;

    public TranscriptResult resolveTranscript(String videoUrl, String manualTranscript) {
        String normalizedManualTranscript = normalizeTranscript(manualTranscript);
        if (StringUtils.hasText(normalizedManualTranscript)) {
            return new TranscriptResult(limit(normalizedManualTranscript, STORED_TRANSCRIPT_LIMIT), "MANUAL");
        }

        Optional<String> apiTranscript = fetchTranscriptApi(videoUrl);
        if (apiTranscript.isPresent()) {
            return new TranscriptResult(limit(apiTranscript.get(), STORED_TRANSCRIPT_LIMIT), "TRANSCRIPT_API");
        }

        Optional<String> videoId = extractVideoId(videoUrl);
        if (videoId.isEmpty()) {
            return TranscriptResult.empty();
        }

        return fetchTranscript(videoId.get())
                .map(text -> new TranscriptResult(limit(text, STORED_TRANSCRIPT_LIMIT), "YOUTUBE_CAPTION"))
                .orElseGet(TranscriptResult::empty);
    }

    public Optional<String> extractVideoId(String videoUrl) {
        if (!StringUtils.hasText(videoUrl)) {
            return Optional.empty();
        }

        String value = videoUrl.trim();
        for (Pattern pattern : List.of(WATCH_ID_PATTERN, SHORT_URL_PATTERN, PATH_ID_PATTERN)) {
            Matcher matcher = pattern.matcher(value);
            if (matcher.find()) {
                return Optional.of(matcher.group(1));
            }
        }

        return Optional.empty();
    }

    private Optional<String> fetchTranscript(String videoId) {
        RestClient client = RestClient.builder()
                .requestFactory(createRequestFactory())
                .build();
        List<TranscriptTrack> tracks = List.of(
                new TranscriptTrack("vi", null),
                new TranscriptTrack("vi", "asr"),
                new TranscriptTrack("en", null),
                new TranscriptTrack("en", "asr"));

        for (TranscriptTrack track : tracks) {
            try {
                String body = client.get()
                        .uri(buildTranscriptUri(videoId, track.language(), track.kind()))
                        .retrieve()
                        .body(String.class);
                String transcript = parseJson3Transcript(body);
                if (StringUtils.hasText(transcript)) {
                    return Optional.of(transcript);
                }
            } catch (Exception exception) {
                log.debug(
                        "Cannot fetch YouTube transcript: videoId={}, lang={}, kind={}, message={}",
                        videoId,
                        track.language(),
                        track.kind(),
                        exception.getMessage());
            }
        }

        return Optional.empty();
    }

    private Optional<String> fetchTranscriptApi(String videoUrl) {
        if (!StringUtils.hasText(videoUrl) || !StringUtils.hasText(transcriptApiKey)) {
            return Optional.empty();
        }

        try {
            RestClient client = RestClient.builder()
                    .baseUrl(transcriptApiBaseUrl.trim())
                    .requestFactory(createRequestFactory())
                    .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + transcriptApiKey.trim())
                    .build();
            String body = client.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/api/v2/youtube/transcript")
                            .queryParam("video_url", videoUrl.trim())
                            .queryParam("format", "json")
                            .build())
                    .retrieve()
                    .body(String.class);
            String transcript = parseTranscriptApiResponse(body);
            return StringUtils.hasText(transcript) ? Optional.of(transcript) : Optional.empty();
        } catch (Exception exception) {
            log.warn("TranscriptAPI request failed: {}", exception.getMessage());
            return Optional.empty();
        }
    }

    private URI buildTranscriptUri(String videoId, String language, String kind) {
        UriComponentsBuilder builder = UriComponentsBuilder
                .fromUriString("https://video.google.com/timedtext")
                .queryParam("fmt", "json3")
                .queryParam("v", videoId)
                .queryParam("lang", language);
        if (StringUtils.hasText(kind)) {
            builder.queryParam("kind", kind);
        }
        return builder.build(true).toUri();
    }

    private SimpleClientHttpRequestFactory createRequestFactory() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(3));
        factory.setReadTimeout(Duration.ofSeconds(5));
        return factory;
    }

    private String parseJson3Transcript(String body) throws Exception {
        if (!StringUtils.hasText(body)) {
            return "";
        }

        JsonNode root = objectMapper.readTree(body);
        JsonNode events = root.path("events");
        if (!events.isArray()) {
            return "";
        }

        List<String> parts = new ArrayList<>();
        for (JsonNode event : events) {
            JsonNode segments = event.path("segs");
            if (!segments.isArray()) {
                continue;
            }
            StringBuilder line = new StringBuilder();
            for (JsonNode segment : segments) {
                String text = segment.path("utf8").asText("");
                if (StringUtils.hasText(text)) {
                    line.append(text);
                }
            }
            String normalizedLine = normalizeTranscript(line.toString());
            if (StringUtils.hasText(normalizedLine)) {
                parts.add(normalizedLine);
            }
        }

        return normalizeTranscript(String.join(" ", parts));
    }

    private String parseTranscriptApiResponse(String body) throws Exception {
        if (!StringUtils.hasText(body)) {
            return "";
        }

        String trimmed = body.trim();
        if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
            return normalizeTranscript(trimmed);
        }

        JsonNode root = objectMapper.readTree(trimmed);
        String directText = firstTextValue(root, "transcript", "text", "content");
        if (StringUtils.hasText(directText)) {
            return normalizeTranscript(directText);
        }

        List<String> parts = new ArrayList<>();
        collectTranscriptParts(root, parts);
        return normalizeTranscript(String.join(" ", parts));
    }

    private String firstTextValue(JsonNode node, String... fieldNames) {
        if (node == null || node.isMissingNode()) {
            return "";
        }
        for (String fieldName : fieldNames) {
            JsonNode value = node.path(fieldName);
            if (value.isTextual() && StringUtils.hasText(value.asText())) {
                return value.asText();
            }
        }
        return "";
    }

    private void collectTranscriptParts(JsonNode node, List<String> parts) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return;
        }
        if (node.isArray()) {
            for (JsonNode item : node) {
                collectTranscriptParts(item, parts);
            }
            return;
        }
        if (!node.isObject()) {
            return;
        }

        String text = firstTextValue(node, "text", "utf8", "content", "transcript");
        if (StringUtils.hasText(text)) {
            parts.add(text);
        }
        for (String fieldName : List.of("segments", "segs", "items", "data", "transcript")) {
            JsonNode child = node.path(fieldName);
            if (child.isArray() || child.isObject()) {
                collectTranscriptParts(child, parts);
            }
        }
    }

    private String normalizeTranscript(String value) {
        if (!StringUtils.hasText(value)) {
            return "";
        }
        return HtmlUtils.htmlUnescape(value)
                .replace('\u00a0', ' ')
                .replaceAll("\\s+", " ")
                .trim();
    }

    private String limit(String value, int maxLength) {
        if (!StringUtils.hasText(value) || value.length() <= maxLength) {
            return value;
        }
        return value.substring(0, maxLength).trim();
    }

    public record TranscriptResult(String text, String source) {
        static TranscriptResult empty() {
            return new TranscriptResult(null, null);
        }
    }

    private record TranscriptTrack(String language, String kind) {
    }
}
