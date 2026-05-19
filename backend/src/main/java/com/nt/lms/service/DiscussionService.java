package com.nt.lms.service;

import com.nt.lms.dto.request.DiscussionModerationRequest;
import com.nt.lms.dto.request.DiscussionReplyRequest;
import com.nt.lms.dto.request.DiscussionTopicRequest;
import com.nt.lms.dto.response.DiscussionAuthorResponse;
import com.nt.lms.dto.response.DiscussionReplyResponse;
import com.nt.lms.dto.response.DiscussionTopicResponse;
import com.nt.lms.entity.Course;
import com.nt.lms.entity.DiscussionReply;
import com.nt.lms.entity.DiscussionTopic;
import com.nt.lms.entity.Lesson;
import com.nt.lms.entity.User;
import com.nt.lms.exception.AppException;
import com.nt.lms.exception.ErrorCode;
import com.nt.lms.repository.CourseRepository;
import com.nt.lms.repository.DiscussionReplyRepository;
import com.nt.lms.repository.DiscussionTopicRepository;
import com.nt.lms.repository.LessonRepository;
import com.nt.lms.repository.UserRepository;
import jakarta.persistence.criteria.Predicate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class DiscussionService {

    private static final String LESSON_COMMENT_TOPIC_TITLE = "Thao luan bai hoc";

    DiscussionTopicRepository topicRepository;
    DiscussionReplyRepository replyRepository;
    CourseRepository courseRepository;
    LessonRepository lessonRepository;
    UserRepository userRepository;

    @Transactional(readOnly = true)
    public Page<DiscussionTopicResponse> getTopics(String courseId, String lessonId, String keyword, int page, int size) {
        User currentUser = getCurrentUser();
        Pageable pageable = PageRequest.of(
                Math.max(page, 0),
                Math.max(1, Math.min(size, 50)),
                Sort.by(Sort.Order.desc("pinned"), Sort.Order.desc("updatedAt")));

        return topicRepository.findAll(buildTopicSpec(courseId, lessonId, keyword), pageable)
                .map(topic -> toTopicResponse(topic, currentUser, false));
    }

    @Transactional(readOnly = true)
    public DiscussionTopicResponse getTopic(String topicId) {
        User currentUser = getCurrentUser();
        DiscussionTopic topic = getTopicOrThrow(topicId);

        DiscussionTopicResponse response = toTopicResponse(topic, currentUser, true);
        response.setReplies(replyRepository.findByTopicIdOrderByCreatedAtAsc(topicId).stream()
                .map(reply -> toReplyResponse(reply, currentUser))
                .toList());
        return response;
    }

    @Transactional(readOnly = true)
    public DiscussionTopicResponse getLessonComments(String lessonId) {
        User currentUser = getCurrentUser();
        Lesson lesson = getLessonOrThrow(lessonId);
        DiscussionTopic topic = topicRepository
                .findFirstByLessonIdAndTitleOrderByCreatedAtAsc(lesson.getId(), LESSON_COMMENT_TOPIC_TITLE)
                .orElse(null);

        if (topic == null) {
            return emptyLessonCommentResponse(lesson, currentUser);
        }

        DiscussionTopicResponse response = toTopicResponse(topic, currentUser, true);
        response.setReplies(replyRepository.findByTopicIdOrderByCreatedAtAsc(topic.getId()).stream()
                .map(reply -> toReplyResponse(reply, currentUser))
                .toList());
        return response;
    }

    @Transactional
    public DiscussionTopicResponse createTopic(DiscussionTopicRequest request) {
        User currentUser = getCurrentUser();
        validateTopicRequest(request);

        Course course = null;
        Lesson lesson = null;
        if (StringUtils.hasText(request.getCourseId())) {
            course = courseRepository.findById(request.getCourseId().trim())
                    .orElseThrow(() -> new AppException(ErrorCode.COURSE_NOT_EXISTED));
        }
        if (StringUtils.hasText(request.getLessonId())) {
            lesson = lessonRepository.findById(request.getLessonId().trim())
                    .orElseThrow(() -> new AppException(ErrorCode.LESSON_NOT_EXISTED));
            if (course == null && lesson.getSection() != null) {
                course = lesson.getSection().getCourse();
            }
        }

        DiscussionTopic topic = DiscussionTopic.builder()
                .course(course)
                .lesson(lesson)
                .createdBy(currentUser)
                .title(request.getTitle().trim())
                .content(request.getContent().trim())
                .pinned(false)
                .locked(false)
                .build();

        return toTopicResponse(topicRepository.save(topic), currentUser, false);
    }

    @Transactional
    public DiscussionTopicResponse updateTopic(String topicId, DiscussionTopicRequest request) {
        User currentUser = getCurrentUser();
        DiscussionTopic topic = getTopicOrThrow(topicId);
        requireTopicEditable(topic, currentUser);

        if (request == null
                || !StringUtils.hasText(request.getTitle())
                || !StringUtils.hasText(request.getContent())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tieu de va noi dung khong duoc de trong");
        }

        topic.setTitle(request.getTitle().trim());
        topic.setContent(request.getContent().trim());
        return toTopicResponse(topicRepository.save(topic), currentUser, false);
    }

    @Transactional
    public DiscussionTopicResponse moderateTopic(String topicId, DiscussionModerationRequest request) {
        User currentUser = getCurrentUser();
        DiscussionTopic topic = getTopicOrThrow(topicId);
        requireModerator(topic, currentUser);

        if (request != null && request.getPinned() != null) {
            topic.setPinned(request.getPinned());
        }
        if (request != null && request.getLocked() != null) {
            topic.setLocked(request.getLocked());
        }

        return toTopicResponse(topicRepository.save(topic), currentUser, true);
    }

    @Transactional
    public void deleteTopic(String topicId) {
        User currentUser = getCurrentUser();
        DiscussionTopic topic = getTopicOrThrow(topicId);
        requireTopicDeletable(topic, currentUser);
        replyRepository.deleteByTopicId(topicId);
        topicRepository.delete(topic);
    }

    @Transactional
    public DiscussionReplyResponse createReply(String topicId, DiscussionReplyRequest request) {
        User currentUser = getCurrentUser();
        DiscussionTopic topic = getTopicOrThrow(topicId);
        if (Boolean.TRUE.equals(topic.getLocked()) && !canModerate(topic, currentUser)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Chu de da khoa");
        }
        if (request == null || !StringUtils.hasText(request.getContent())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Noi dung phan hoi khong duoc de trong");
        }

        DiscussionReply parentReply = null;
        if (StringUtils.hasText(request.getParentReplyId())) {
            parentReply = replyRepository.findById(request.getParentReplyId().trim())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Khong tim thay phan hoi cha"));
            if (!topic.getId().equals(parentReply.getTopic().getId())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Phan hoi cha khong thuoc chu de nay");
            }
        }

        DiscussionReply reply = DiscussionReply.builder()
                .topic(topic)
                .parentReply(parentReply)
                .user(currentUser)
                .content(request.getContent().trim())
                .build();

        topic.setUpdatedAt(LocalDateTime.now());
        topicRepository.save(topic);
        return toReplyResponse(replyRepository.save(reply), currentUser);
    }

    @Transactional
    public DiscussionReplyResponse createLessonComment(String lessonId, DiscussionReplyRequest request) {
        User currentUser = getCurrentUser();
        Lesson lesson = getLessonOrThrow(lessonId);
        if (request == null || !StringUtils.hasText(request.getContent())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Noi dung binh luan khong duoc de trong");
        }

        DiscussionTopic topic = topicRepository
                .findFirstByLessonIdAndTitleOrderByCreatedAtAsc(lesson.getId(), LESSON_COMMENT_TOPIC_TITLE)
                .orElseGet(() -> topicRepository.save(DiscussionTopic.builder()
                        .course(lesson.getSection() != null ? lesson.getSection().getCourse() : null)
                        .lesson(lesson)
                        .createdBy(currentUser)
                        .title(LESSON_COMMENT_TOPIC_TITLE)
                        .content("Luong binh luan cua bai hoc: " + lesson.getTitle())
                        .pinned(false)
                        .locked(false)
                        .build()));

        if (Boolean.TRUE.equals(topic.getLocked()) && !canModerate(topic, currentUser)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Binh luan bai hoc da khoa");
        }

        DiscussionReply parentReply = null;
        if (StringUtils.hasText(request.getParentReplyId())) {
            parentReply = replyRepository.findById(request.getParentReplyId().trim())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Khong tim thay binh luan cha"));
            if (!topic.getId().equals(parentReply.getTopic().getId())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Binh luan cha khong thuoc bai hoc nay");
            }
        }

        DiscussionReply reply = DiscussionReply.builder()
                .topic(topic)
                .parentReply(parentReply)
                .user(currentUser)
                .content(request.getContent().trim())
                .build();

        topic.setUpdatedAt(LocalDateTime.now());
        topicRepository.save(topic);
        return toReplyResponse(replyRepository.save(reply), currentUser);
    }

    @Transactional
    public DiscussionReplyResponse updateReply(String replyId, DiscussionReplyRequest request) {
        User currentUser = getCurrentUser();
        DiscussionReply reply = getReplyOrThrow(replyId);
        if (!canEditReply(reply, currentUser)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Khong co quyen sua phan hoi");
        }
        if (request == null || !StringUtils.hasText(request.getContent())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Noi dung phan hoi khong duoc de trong");
        }

        reply.setContent(request.getContent().trim());
        return toReplyResponse(replyRepository.save(reply), currentUser);
    }

    @Transactional
    public void deleteReply(String replyId) {
        User currentUser = getCurrentUser();
        DiscussionReply reply = getReplyOrThrow(replyId);
        if (!canDeleteReply(reply, currentUser)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Khong co quyen xoa phan hoi");
        }
        DiscussionTopic topic = reply.getTopic();
        replyRepository.delete(reply);
        if (topic != null) {
            topic.setUpdatedAt(LocalDateTime.now());
            topicRepository.save(topic);
        }
    }

    private Specification<DiscussionTopic> buildTopicSpec(String courseId, String lessonId, String keyword) {
        return (root, query, builder) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (StringUtils.hasText(courseId)) {
                predicates.add(builder.equal(root.get("course").get("id"), courseId.trim()));
            }
            if (StringUtils.hasText(lessonId)) {
                predicates.add(builder.equal(root.get("lesson").get("id"), lessonId.trim()));
            } else {
                predicates.add(builder.isNull(root.get("lesson")));
            }
            if (StringUtils.hasText(keyword)) {
                String pattern = "%" + keyword.trim().toLowerCase(java.util.Locale.ROOT) + "%";
                predicates.add(builder.or(
                        builder.like(builder.lower(root.get("title").as(String.class)), pattern),
                        builder.like(builder.lower(root.get("content").as(String.class)), pattern)));
            }

            return builder.and(predicates.toArray(new Predicate[0]));
        };
    }

    private void validateTopicRequest(DiscussionTopicRequest request) {
        if (request == null
                || !StringUtils.hasText(request.getTitle())
                || !StringUtils.hasText(request.getContent())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tieu de va noi dung khong duoc de trong");
        }
    }

    private DiscussionTopic getTopicOrThrow(String topicId) {
        return topicRepository.findById(topicId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Khong tim thay chu de"));
    }

    private Lesson getLessonOrThrow(String lessonId) {
        return lessonRepository.findById(lessonId)
                .orElseThrow(() -> new AppException(ErrorCode.LESSON_NOT_EXISTED));
    }

    private DiscussionReply getReplyOrThrow(String replyId) {
        return replyRepository.findById(replyId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Khong tim thay phan hoi"));
    }

    private User getCurrentUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));
    }

    private void requireTopicEditable(DiscussionTopic topic, User user) {
        if (!canEditTopic(topic, user)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Khong co quyen sua chu de");
        }
    }

    private void requireTopicDeletable(DiscussionTopic topic, User user) {
        if (!canDeleteTopic(topic, user)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Khong co quyen xoa chu de");
        }
    }

    private void requireModerator(DiscussionTopic topic, User user) {
        if (!canModerate(topic, user)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Khong co quyen quan tri chu de");
        }
    }

    private boolean canEditTopic(DiscussionTopic topic, User user) {
        return isAuthor(topic.getCreatedBy(), user) || canModerate(topic, user);
    }

    private boolean canDeleteTopic(DiscussionTopic topic, User user) {
        return isAuthor(topic.getCreatedBy(), user) || canModerate(topic, user);
    }

    private boolean canModerate(DiscussionTopic topic, User user) {
        return hasRole(user, "ADMIN") || isCourseInstructor(topic.getCourse(), user);
    }

    private boolean canEditReply(DiscussionReply reply, User user) {
        return isAuthor(reply.getUser(), user) || canModerate(reply.getTopic(), user);
    }

    private boolean canDeleteReply(DiscussionReply reply, User user) {
        return isAuthor(reply.getUser(), user) || canModerate(reply.getTopic(), user);
    }

    private boolean isCourseInstructor(Course course, User user) {
        return course != null
                && course.getInstructor() != null
                && user != null
                && course.getInstructor().getId().equals(user.getId());
    }

    private boolean hasRole(User user, String roleName) {
        return user != null
                && user.getRoles() != null
                && user.getRoles().stream().anyMatch(role -> roleName.equals(role.getName()));
    }

    private boolean isAuthor(User author, User user) {
        return author != null && user != null && author.getId().equals(user.getId());
    }

    private DiscussionTopicResponse toTopicResponse(DiscussionTopic topic, User currentUser, boolean includeContent) {
        return DiscussionTopicResponse.builder()
                .id(topic.getId())
                .courseId(topic.getCourse() != null ? topic.getCourse().getId() : null)
                .courseTitle(topic.getCourse() != null ? topic.getCourse().getTitle() : null)
                .lessonId(topic.getLesson() != null ? topic.getLesson().getId() : null)
                .lessonTitle(topic.getLesson() != null ? topic.getLesson().getTitle() : null)
                .title(topic.getTitle())
                .content(includeContent ? topic.getContent() : shortContent(topic.getContent()))
                .pinned(Boolean.TRUE.equals(topic.getPinned()))
                .locked(Boolean.TRUE.equals(topic.getLocked()))
                .replyCount(replyRepository.countByTopicId(topic.getId()))
                .author(toAuthorResponse(topic.getCreatedBy()))
                .canEdit(canEditTopic(topic, currentUser))
                .canDelete(canDeleteTopic(topic, currentUser))
                .canModerate(canModerate(topic, currentUser))
                .createdAt(topic.getCreatedAt())
                .updatedAt(topic.getUpdatedAt())
                .build();
    }

    private DiscussionTopicResponse emptyLessonCommentResponse(Lesson lesson, User currentUser) {
        Course course = lesson.getSection() != null ? lesson.getSection().getCourse() : null;
        return DiscussionTopicResponse.builder()
                .courseId(course != null ? course.getId() : null)
                .courseTitle(course != null ? course.getTitle() : null)
                .lessonId(lesson.getId())
                .lessonTitle(lesson.getTitle())
                .title(LESSON_COMMENT_TOPIC_TITLE)
                .content("")
                .pinned(false)
                .locked(false)
                .replyCount(0L)
                .canEdit(false)
                .canDelete(false)
                .canModerate(hasRole(currentUser, "ADMIN") || isCourseInstructor(course, currentUser))
                .replies(List.of())
                .build();
    }

    private DiscussionReplyResponse toReplyResponse(DiscussionReply reply, User currentUser) {
        return DiscussionReplyResponse.builder()
                .id(reply.getId())
                .topicId(reply.getTopic() != null ? reply.getTopic().getId() : null)
                .parentReplyId(reply.getParentReply() != null ? reply.getParentReply().getId() : null)
                .content(reply.getContent())
                .author(toAuthorResponse(reply.getUser()))
                .canEdit(canEditReply(reply, currentUser))
                .canDelete(canDeleteReply(reply, currentUser))
                .createdAt(reply.getCreatedAt())
                .updatedAt(reply.getUpdatedAt())
                .build();
    }

    private DiscussionAuthorResponse toAuthorResponse(User user) {
        if (user == null) {
            return null;
        }
        return DiscussionAuthorResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .fullName(user.getFullName())
                .avatar(user.getAvatar())
                .build();
    }

    private String shortContent(String value) {
        if (!StringUtils.hasText(value)) {
            return "";
        }
        String text = value.trim();
        return text.length() > 240 ? text.substring(0, 240) + "..." : text;
    }
}
