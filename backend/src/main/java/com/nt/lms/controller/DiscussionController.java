package com.nt.lms.controller;

import com.nt.lms.dto.request.DiscussionModerationRequest;
import com.nt.lms.dto.request.DiscussionReplyRequest;
import com.nt.lms.dto.request.DiscussionTopicRequest;
import com.nt.lms.dto.response.ApiResponse;
import com.nt.lms.dto.response.DiscussionReplyResponse;
import com.nt.lms.dto.response.DiscussionTopicResponse;
import com.nt.lms.service.DiscussionService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/discussions")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class DiscussionController {

    DiscussionService discussionService;

    @GetMapping("/topics")
    ApiResponse<Page<DiscussionTopicResponse>> getTopics(
            @RequestParam(required = false) String courseId,
            @RequestParam(required = false) String lessonId,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ApiResponse.<Page<DiscussionTopicResponse>>builder()
                .result(discussionService.getTopics(courseId, lessonId, keyword, page, size))
                .build();
    }

    @GetMapping("/topics/{topicId}")
    ApiResponse<DiscussionTopicResponse> getTopic(@PathVariable String topicId) {
        return ApiResponse.<DiscussionTopicResponse>builder()
                .result(discussionService.getTopic(topicId))
                .build();
    }

    @GetMapping("/lessons/{lessonId}/comments")
    ApiResponse<DiscussionTopicResponse> getLessonComments(@PathVariable String lessonId) {
        return ApiResponse.<DiscussionTopicResponse>builder()
                .result(discussionService.getLessonComments(lessonId))
                .build();
    }

    @PostMapping("/topics")
    ApiResponse<DiscussionTopicResponse> createTopic(@RequestBody DiscussionTopicRequest request) {
        return ApiResponse.<DiscussionTopicResponse>builder()
                .result(discussionService.createTopic(request))
                .build();
    }

    @PutMapping("/topics/{topicId}")
    ApiResponse<DiscussionTopicResponse> updateTopic(
            @PathVariable String topicId,
            @RequestBody DiscussionTopicRequest request) {
        return ApiResponse.<DiscussionTopicResponse>builder()
                .result(discussionService.updateTopic(topicId, request))
                .build();
    }

    @PatchMapping("/topics/{topicId}/moderation")
    ApiResponse<DiscussionTopicResponse> moderateTopic(
            @PathVariable String topicId,
            @RequestBody DiscussionModerationRequest request) {
        return ApiResponse.<DiscussionTopicResponse>builder()
                .result(discussionService.moderateTopic(topicId, request))
                .build();
    }

    @DeleteMapping("/topics/{topicId}")
    ApiResponse<Void> deleteTopic(@PathVariable String topicId) {
        discussionService.deleteTopic(topicId);
        return ApiResponse.<Void>builder().build();
    }

    @PostMapping("/topics/{topicId}/replies")
    ApiResponse<DiscussionReplyResponse> createReply(
            @PathVariable String topicId,
            @RequestBody DiscussionReplyRequest request) {
        return ApiResponse.<DiscussionReplyResponse>builder()
                .result(discussionService.createReply(topicId, request))
                .build();
    }

    @PostMapping("/lessons/{lessonId}/comments")
    ApiResponse<DiscussionReplyResponse> createLessonComment(
            @PathVariable String lessonId,
            @RequestBody DiscussionReplyRequest request) {
        return ApiResponse.<DiscussionReplyResponse>builder()
                .result(discussionService.createLessonComment(lessonId, request))
                .build();
    }

    @PutMapping("/replies/{replyId}")
    ApiResponse<DiscussionReplyResponse> updateReply(
            @PathVariable String replyId,
            @RequestBody DiscussionReplyRequest request) {
        return ApiResponse.<DiscussionReplyResponse>builder()
                .result(discussionService.updateReply(replyId, request))
                .build();
    }

    @DeleteMapping("/replies/{replyId}")
    ApiResponse<Void> deleteReply(@PathVariable String replyId) {
        discussionService.deleteReply(replyId);
        return ApiResponse.<Void>builder().build();
    }
}
