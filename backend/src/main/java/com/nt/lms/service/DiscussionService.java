package com.nt.lms.service;

import com.nt.lms.dto.request.DiscussionReplyRequest;
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
import com.nt.lms.repository.DiscussionReplyRepository;
import com.nt.lms.repository.DiscussionTopicRepository;
import com.nt.lms.repository.LessonRepository;
import com.nt.lms.repository.UserRepository;
import java.time.LocalDateTime;
import java.util.List;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
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
    LessonRepository lessonRepository;
    UserRepository userRepository;

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

        DiscussionTopicResponse response = toTopicResponse(topic, currentUser);
        response.setReplies(replyRepository.findByTopicIdOrderByCreatedAtAsc(topic.getId()).stream()
                .map(reply -> toReplyResponse(reply, currentUser))
                .toList());
        return response;
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

    private boolean canModerate(DiscussionTopic topic, User user) {
        return hasRole(user, "ADMIN") || isCourseInstructor(topic.getCourse(), user);
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

    private DiscussionTopicResponse toTopicResponse(DiscussionTopic topic, User currentUser) {
        return DiscussionTopicResponse.builder()
                .id(topic.getId())
                .courseId(topic.getCourse() != null ? topic.getCourse().getId() : null)
                .courseTitle(topic.getCourse() != null ? topic.getCourse().getTitle() : null)
                .lessonId(topic.getLesson() != null ? topic.getLesson().getId() : null)
                .lessonTitle(topic.getLesson() != null ? topic.getLesson().getTitle() : null)
                .title(topic.getTitle())
                .content(topic.getContent())
                .pinned(Boolean.TRUE.equals(topic.getPinned()))
                .locked(Boolean.TRUE.equals(topic.getLocked()))
                .replyCount(replyRepository.countByTopicId(topic.getId()))
                .author(toAuthorResponse(topic.getCreatedBy()))
                .canEdit(false)
                .canDelete(false)
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
                .canEdit(false)
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

}
