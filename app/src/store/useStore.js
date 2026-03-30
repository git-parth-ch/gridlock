// app/src/store/useStore.js
import { create } from 'zustand';

const useStore = create((set, get) => ({
  // ── Session ───────────────────────────────────────────────
  team: null,
  deviceId: null,
  teamCode: null,          // persisted team code for reconnect/resume
  questions: [],          // [{ id, type, topic, language, image_url, status, segmentValue }]
  segments: {},           // { coordinateSegment: segmentValue }
  violationCount: { W: 0, F: 0 },
  sessionStatus: 'preflight', // preflight | waiting | active | frozen | disqualified | ended
  coordinate: null,        // revealed coordinate object
  adminMessage: null,
  deviceTimerStart: null,   // timestamp (ms) when this device entered the test
  deviceTimerOffset: 0,     // accumulated seconds before current start (for future extension)
  connectionStatus: 'offline', // offline | connecting | online | reconnecting

  setTeam:    (team)    => set({ team }),
  setDeviceId:(id)      => set({ deviceId: id }),
  setTeamCode: (code)   => set({ teamCode: code }),
  setConnectionStatus: (status) => set({ connectionStatus: status }),

  setQuestions: (questions) => set({ questions }),

  updateQuestionStatus: (questionId, status, extra = {}) =>
    set(state => ({
      questions: state.questions.map(q =>
        q.id === questionId ? { ...q, status, ...extra } : q
      )
    })),

  addSegment: (coordinateSegment, segmentValue) =>
    set(state => ({
      segments: { ...state.segments, [coordinateSegment]: segmentValue }
    })),

  setViolationCount: (count) => set({ violationCount: count }),

  setSessionStatus: (status) => set({ sessionStatus: status }),

  setCoordinate: (coordinate) => set({ coordinate }),

  setAdminMessage: (msg) => set({ adminMessage: msg }),

  startDeviceTimer: () => {
    // Only set the start once per login session
    set(state => state.deviceTimerStart ? state : { deviceTimerStart: Date.now(), deviceTimerOffset: state.deviceTimerOffset || 0 });
  },

  // ── UI ────────────────────────────────────────────────────
  openQuestion: null,
  setOpenQuestion: (q) => set({ openQuestion: q }),

  // Per-question Monaco drafts (survive back → dashboard → same question)
  questionDrafts: {},
  setQuestionDraft: (questionId, text) =>
    set(state => ({
      questionDrafts: { ...state.questionDrafts, [questionId]: text },
    })),

  // Reset local device session (used by both user logout and admin forced logout).
  resetSession: () => {
    set({
      team: null,
      deviceId: null,
      teamCode: null,
      questions: [],
      segments: {},
      violationCount: { W: 0, F: 0 },
      sessionStatus: 'login',
      coordinate: null,
      adminMessage: null,
      openQuestion: null,
      questionDrafts: {},
      deviceTimerStart: null,
      deviceTimerOffset: 0,
      connectionStatus: 'offline',
    });
  },
}));

export default useStore;