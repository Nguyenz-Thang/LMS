package com.nt.lms.service;

import java.util.List;
import java.util.Map;

import com.nt.lms.dto.request.CreateQuizRequest;
import com.nt.lms.dto.request.SubmitQuizRequest;
import com.nt.lms.dto.response.QuizResponse;
import com.nt.lms.dto.response.QuizResultResponse;
import com.nt.lms.entity.*;
import com.nt.lms.exception.AppException;
import com.nt.lms.exception.ErrorCode;
import com.nt.lms.repository.*;

import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.AccessLevel;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class QuizService {

    QuizRepository quizRepository;
    QuestionRepository questionRepository;
    AnswerRepository answerRepository;
    QuizResultRepository quizResultRepository;
    UserRepository userRepository;
    CourseRepository courseRepository;
    public void createQuiz(CreateQuizRequest request) {

        Course course = courseRepository.findById(request.getCourseId())
                .orElseThrow(() -> new AppException(ErrorCode.COURSE_NOT_EXISTED));

        Quiz quiz = Quiz.builder()
                .title(request.getTitle())
                .course(course)
                .build();

        quizRepository.save(quiz);

        for (var q : request.getQuestions()) {

            Question question = Question.builder()
                    .content(q.getContent())
                    .quiz(quiz)
                    .build();

            questionRepository.save(question);

            for (var a : q.getAnswers()) {

                Answer answer = Answer.builder()
                        .content(a.getContent())
                        .isCorrect(a.isCorrect())
                        .question(question)
                        .build();

                answerRepository.save(answer);
            }
        }
    }
    public QuizResponse getQuiz(String id) {

        Quiz quiz = quizRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.QUIZ_NOT_EXISTED));

        List<Question> questions = questionRepository.findByQuizId(id);

        return QuizResponse.builder()
                .id(quiz.getId())
                .title(quiz.getTitle())
                .questions(questions.stream().map(q ->
                        QuizResponse.Question.builder()
                                .id(q.getId())
                                .content(q.getContent())
                                .answers(q.getAnswers().stream().map(a ->
                                        QuizResponse.Answer.builder()
                                                .id(a.getId())
                                                .content(a.getContent())
                                                .build()
                                ).toList())
                                .build()
                ).toList())
                .build();
    }
    public void updateQuiz(String quizId, CreateQuizRequest request) {

        Quiz quiz = quizRepository.findById(quizId)
                .orElseThrow(() -> new AppException(ErrorCode.QUIZ_NOT_EXISTED));

        // xóa toàn bộ question cũ
        List<Question> oldQuestions = questionRepository.findByQuizId(quizId);
        for (Question q : oldQuestions) {
            answerRepository.deleteAll(q.getAnswers());
        }
        questionRepository.deleteAll(oldQuestions);

        // update title
        quiz.setTitle(request.getTitle());
        quizRepository.save(quiz);

        // tạo lại
        createQuiz(request);
    }
    public void deleteQuiz(String quizId) {

        Quiz quiz = quizRepository.findById(quizId)
                .orElseThrow(() -> new AppException(ErrorCode.QUIZ_NOT_EXISTED));

        List<Question> questions = questionRepository.findByQuizId(quizId);

        for (Question q : questions) {
            answerRepository.deleteAll(q.getAnswers());
        }

        questionRepository.deleteAll(questions);
        quizRepository.delete(quiz);
    }
    // ✅ SUBMIT QUIZ
    public QuizResultResponse submitQuiz(SubmitQuizRequest request) {

        Quiz quiz = quizRepository.findById(request.getQuizId())
                .orElseThrow(() -> new AppException(ErrorCode.QUIZ_NOT_EXISTED));

        List<Question> questions = questionRepository.findByQuizId(quiz.getId());

        int correct = 0;

        for (Question q : questions) {

            String selectedAnswerId = request.getAnswers().get(q.getId());

            if (selectedAnswerId == null) continue;

            Answer answer = answerRepository.findById(selectedAnswerId)
                    .orElse(null);

            if (answer != null && answer.isCorrect()) {
                correct++;
            }
        }

        double score = (double) correct / questions.size() * 10;

        // lưu kết quả
        String username = SecurityContextHolder.getContext()
                .getAuthentication().getName();

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        QuizResult result = QuizResult.builder()
                .quiz(quiz)
                .user(user)
                .score(score)
                .build();

        quizResultRepository.save(result);

        return QuizResultResponse.builder()
                .quizId(quiz.getId())
                .score(score)
                .build();
    }
}