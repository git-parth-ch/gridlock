// app/src/App.jsx
import useStore from './store/useStore';
import PreflightPage  from './pages/PreflightPage';
import LoginPage      from './pages/LoginPage';
import DashboardPage  from './pages/DashboardPage';
import QuestionPage   from './pages/QuestionPage';

import ViolationMonitor from './components/ViolationMonitor';

export default function App() {
  const { sessionStatus, openQuestion } = useStore();

  // If a question is open, show the question view on top with ViolationMonitor
  if (openQuestion) return (
    <>
      <ViolationMonitor />
      <QuestionPage />
    </>
  );

  let page;
  switch (sessionStatus) {
    case 'preflight':
      page = <PreflightPage />;
      break;
    case 'login':
      page = <LoginPage />;
      break;
    default:
      page = <DashboardPage />;
  }

  return (
    <>
      <ViolationMonitor />
      {page}
    </>
  );
}