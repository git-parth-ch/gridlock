// app/src/store/useStore.js
import { create } from 'zustand';

const useStore = create((set, get) => ({
  // ── Session ───────────────────────────────────────────────
  team: null,
  deviceId: null,
  questions: [],          // [{ id, type, topic, language, image_url, status, segmentValue }]
  segments: {},           // { coordinateSegment: segmentValue }
  violationCount: { W: 0, F: 0 },
  sessionStatus: 'preflight', // preflight | waiting | active | frozen | disqualified | ended
  coordinate: null,        // revealed coordinate object
  adminMessage: null,

  setTeam:    (team)    => set({ team }),
  setDeviceId:(id)      => set({ deviceId: id }),

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

  // ── UI ────────────────────────────────────────────────────
  openQuestion: null,
  setOpenQuestion: (q) => set({ openQuestion: q }),
}));

export default useStore;