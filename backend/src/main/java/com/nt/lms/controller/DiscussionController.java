package com.nt.lms.controller;

import com.nt.lms.dto.request.DiscussionReplyRequest;
import com.nt.lms.dto.response.ApiResponse;
import com.nt.lms.dto.response.DiscussionReplyResponse;
import com.nt.lms.dto.response.DiscussionTopicResponse;
import com.nt.lms.service.DiscussionService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/discussions")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class DiscussionController {

    DiscussionService discussionService;

    @GetMapping("/lessons/{lessonId}/comments")
    ApiResponse<DiscussionTopicResponse> getLessonComments(@PathVariable String lessonId) {
        return ApiResponse.<DiscussionTopicResponse>builder()
                .result(discussionService.getLessonComments(lessonId))
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

    @DeleteMapping("/replies/{replyId}")
    ApiResponse<Void> deleteReply(@PathVariable String replyId) {
        discussionService.deleteReply(replyId);
        return ApiResponse.<Void>builder().build();
    }
}
