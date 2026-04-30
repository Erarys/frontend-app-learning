import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import { useDispatch, useSelector } from 'react-redux';
import { getConfig } from '@edx/frontend-platform';
import { useLocation, useNavigate } from 'react-router-dom';
import { breakpoints, useWindowSize } from '@openedx/paragon';

import { AlertList } from '@src/generic/user-messages';
import { useModel } from '@src/generic/model-store';
import { getCoursewareOutlineSidebarSettings } from '../data/selectors';
import Chat from './chat/Chat';
import SidebarProvider from './sidebar/SidebarContextProvider';
import NewSidebarProvider from './new-sidebar/SidebarContextProvider';
import { NotificationsDiscussionsSidebarTriggerSlot } from '../../plugin-slots/NotificationsDiscussionsSidebarTriggerSlot';
import { CelebrationModal, shouldCelebrateOnSectionLoad, WeeklyGoalCelebrationModal } from './celebration';
import ContentTools from './content-tools';
import Sequence from './sequence';
import { CourseOutlineMobileSidebarTriggerSlot } from '../../plugin-slots/CourseOutlineMobileSidebarTriggerSlot';
import { CourseBreadcrumbsSlot } from '../../plugin-slots/CourseBreadcrumbsSlot';

import { useCallback } from 'react';

const Course = ({
  courseId,
  sequenceId,
  unitId,
  nextSequenceHandler,
  previousSequenceHandler,
  unitNavigationHandler,
  windowWidth,
}) => {
    const [isExamActive, setIsExamActive] = useState(false);
  console.log("Course.jsx WORKS with new code NoneStop👑👑👑");
  const course = useModel('coursewareMeta', courseId);
  const {
    celebrations,
    isStaff,
    isNewDiscussionSidebarViewEnabled,
    originalUserIsStaff,
  } = useModel('courseHomeMeta', courseId);
  const sequence = useModel('sequences', sequenceId);
  const section = useModel('sections', sequence ? sequence.sectionId : null);
  const { enableNavigationSidebar } = useSelector(getCoursewareOutlineSidebarSettings);
  const navigationDisabled = enableNavigationSidebar || (sequence?.navigationDisabled ?? false);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const section_name = [
  section?.title,
  sequence?.title,
].filter(Boolean).join(' ');

  if (!originalUserIsStaff && pathname.startsWith('/preview')) {
    const courseUrl = pathname.replace('/preview', '');
    navigate(courseUrl, { replace: true });
  }

  const pageTitleBreadCrumbs = [
    sequence,
    section,
    course,
  ].filter(element => element != null).map(element => element.title);

  // Below the tabs, above the breadcrumbs alerts (appearing in the order listed here)
  const dispatch = useDispatch();

  const [firstSectionCelebrationOpen, setFirstSectionCelebrationOpen] = useState(false);
  // If streakLengthToCelebrate is populated, that modal takes precedence. Wait til the next load to display
  // the weekly goal celebration modal.
  const [weeklyGoalCelebrationOpen, setWeeklyGoalCelebrationOpen] = useState(
    celebrations && !celebrations.streakLengthToCelebrate && celebrations.weeklyGoal,
  );
  const shouldDisplayChat = windowWidth >= breakpoints.medium.minWidth;
  const daysPerWeek = course?.courseGoals?.selectedGoal?.daysPerWeek;
  // Завершение экзамена
//   useEffect(() => {
//   const observer = new MutationObserver(() => {
//     const btn = document.querySelector('[data-testid="end-exam-button"]');
//
//     if (btn && !btn.dataset.hookedFinish) {
//       btn.dataset.hookedFinish = "true";
//
//       console.log("HOOKED FINISH BUTTON ✅");
//
//       btn.addEventListener("click", () => {
//         console.log("FINISH PROCTORING 🚀");
//
//         const redirectUrl = window.location.href;
//
//         // даём submitExam выполниться
//         setTimeout(() => {
//           window.location.href = `http://local.openedx.io/finish-exam/?redirectUrl=${encodeURIComponent(redirectUrl)}`;
//         }, 1500);
//       });
//     }
//   });
//
//   observer.observe(document.body, { childList: true, subtree: true });
//
//   return () => observer.disconnect();
// }, []);
// === EXAM GUARD START ===

const location = useLocation();

// 🔒 1. Блок кликов по навигации
useEffect(() => {
  if (!isExamActive) return;

  const blockNavigation = (e) => {
    const link = e.target.closest('a');

    if (!link) return;

    // разрешаем только ссылки внутри текущего sequential
    if (!link.href.includes(sequenceId)) {
      e.preventDefault();
      e.stopPropagation();
      console.log("🚫 Navigation click blocked");
    }
  };

  document.addEventListener('click', blockNavigation, true);

  return () => {
    document.removeEventListener('click', blockNavigation, true);
  };
}, [isExamActive, sequenceId]);

// 🔁 2. Контроль URL (если пользователь ушёл)
useEffect(() => {
  if (!isExamActive) return;

  const path = location.pathname;

  const match = path.match(/type@sequential\+block@([a-z0-9]+)/);
  if (!match) return;

  const currentSequential = match[1];

  if (currentSequential !== sequenceId) {
    console.log("🚫 Redirecting back to exam");

    // возвращаем назад (текущий unit)
    navigate(path, { replace: true });
  }
}, [location.pathname, isExamActive, sequenceId]);

// 🔙 3. Блок кнопки "назад"
useEffect(() => {
  console.log("isExamActive", isExamActive)
  if (!isExamActive) return;

  const handlePopState = () => {
    console.log("🚫 Back button blocked");

    navigate(location.pathname, { replace: true });
  };

  window.addEventListener('popstate', handlePopState);

  return () => {
    window.removeEventListener('popstate', handlePopState);
  };
}, [isExamActive, location.pathname]);

// Test
const allowedPath = `/courseware/${courseId}/`;

useEffect(() => {
  if (!isExamActive) return;

  if (!location.pathname.includes(sequenceId)) {
    console.log("🚫 Hard redirect to exam");

    navigate(
      `/courseware/${courseId}/type@sequential+block@${sequenceId}`,
      { replace: true }
    );
  }
}, [location.pathname, isExamActive, sequenceId, courseId]);


useEffect(() => {
  const active = sessionStorage.getItem("exam_active") === "1";
  if (active) {
    setIsExamActive(true);
  }
}, []);


const finishExam = () => {
  console.log("✅ EXAM FINISHED");

  sessionStorage.removeItem("exam_active");
  setIsExamActive(false);
};

useEffect(() => {
  const observer = new MutationObserver(() => {
    const btn = document.querySelector('[data-testid="start-exam-button"]');

    if (btn && !btn.dataset.hooked) {
      btn.dataset.hooked = "true";

      btn.addEventListener(
        "click",
        () => {
          console.log("🚀 EXAM STARTED");

          // ✅ сохраняем состояние
          sessionStorage.setItem("exam_active", "1");

          // ✅ обновляем React state
          setIsExamActive(true);
        },
        true
      );
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  return () => observer.disconnect();
}, []);
// === EXAM GUARD END ===
//  useEffect(() => {
//   const params = new URLSearchParams(window.location.search);
//
//   // ❌ если уже вернулись с прокторинга — НЕ перехватываем
//   if (params.get('start_exam') === '1') {
//     console.log("⛔ Skip interception (return from proctoring)");
//     return;
//   }
//
//   const observer = new MutationObserver(() => {
//     const btn = document.querySelector('[data-testid="start-exam-button"]');
//
//     if (btn && !btn.dataset.hooked) {
//       btn.dataset.hooked = "true";
//
//       console.log("HOOKED BUTTON ✅");
//
//       btn.addEventListener(
//         "click",
//         (e) => {
//           e.preventDefault();
//           e.stopPropagation();
//           e.stopImmediatePropagation();
//
//           console.log("REDIRECT TO PROCTORING 🚀");
//
//           const url = new URL(window.location.href);
//           url.searchParams.set("start_exam", "1");
//
//           const params = new URLSearchParams({
//               course_name: course?.title,
//               unit_url: url.toString(),
//               section_name: section_name
//           });
//
//           window.location.href = `http://local.openedx.io/go-to-exam/?${params.toString()}`;
//         },
//         true
//       );
//     }
//   });
//
//   observer.observe(document.body, { childList: true, subtree: true });
//
//   return () => observer.disconnect();
// }, []);
//   // Конец скрипта

  useEffect(() => {
    const celebrateFirstSection = celebrations && celebrations.firstSection;
    setFirstSectionCelebrationOpen(shouldCelebrateOnSectionLoad(
      courseId,
      sequenceId,
      celebrateFirstSection,
      dispatch,
      celebrations,
    ));
  }, [sequenceId]);

  const SidebarProviderComponent = isNewDiscussionSidebarViewEnabled ? NewSidebarProvider : SidebarProvider;

  return (
    <SidebarProviderComponent courseId={courseId} unitId={unitId}>
      <Helmet>
        <title>{`${pageTitleBreadCrumbs.join(' | ')} | ${getConfig().SITE_NAME}`}</title>
      </Helmet>
      <div className="position-relative d-flex align-items-xl-center mb-4 mt-1 flex-column flex-xl-row">
        {navigationDisabled || (
        <>
          <CourseBreadcrumbsSlot
            courseId={courseId}
            sectionId={section ? section.id : null}
            sequenceId={sequenceId}
            isStaff={isStaff}
            unitId={unitId}
          />
        </>
        )}
        {shouldDisplayChat && (
          <>
            <Chat
              enabled={course.learningAssistantEnabled}
              enrollmentMode={course.enrollmentMode}
              isStaff={isStaff}
              courseId={courseId}
              contentToolsEnabled={course.showCalculator || course.notes.enabled}
              unitId={unitId}
            />
          </>
        )}
        <div className="w-100 d-flex align-items-center">
          <CourseOutlineMobileSidebarTriggerSlot />
          <NotificationsDiscussionsSidebarTriggerSlot courseId={courseId} />
        </div>
      </div>

      <AlertList topic="sequence" />
      <Sequence
        unitId={unitId}
        sequenceId={sequenceId}
        courseId={courseId}
        unitNavigationHandler={unitNavigationHandler}
        nextSequenceHandler={nextSequenceHandler}
        previousSequenceHandler={previousSequenceHandler}
      />
      <CelebrationModal
        courseId={courseId}
        isOpen={firstSectionCelebrationOpen}
        onClose={() => setFirstSectionCelebrationOpen(false)}
      />
      <WeeklyGoalCelebrationModal
        courseId={courseId}
        daysPerWeek={daysPerWeek}
        isOpen={weeklyGoalCelebrationOpen}
        onClose={() => setWeeklyGoalCelebrationOpen(false)}
      />
      <ContentTools course={course} />
    </SidebarProviderComponent>
  );
};

Course.propTypes = {
  courseId: PropTypes.string,
  sequenceId: PropTypes.string,
  unitId: PropTypes.string,
  nextSequenceHandler: PropTypes.func.isRequired,
  previousSequenceHandler: PropTypes.func.isRequired,
  unitNavigationHandler: PropTypes.func.isRequired,
  windowWidth: PropTypes.number.isRequired,
};

Course.defaultProps = {
  courseId: null,
  sequenceId: null,
  unitId: null,
};

const CourseWrapper = (props) => {
  // useWindowSize initially returns an undefined width intentionally at first.
  // See https://www.joshwcomeau.com/react/the-perils-of-rehydration/ for why.
  // But <Course> has some tricky window-size-dependent, session-storage-setting logic and React would yell at us if
  // we exited that component early, before hitting all the useState() calls.
  // So just skip all that until we have a window size available.
  const windowWidth = useWindowSize().width;
  if (windowWidth === undefined) {
    return null;
  }

  return <Course {...props} windowWidth={windowWidth} />;
};

export default CourseWrapper;
