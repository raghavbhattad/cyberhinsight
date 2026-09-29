import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useOutletContext } from 'react-router-dom';
import Layout from './components/Layout';
import ChatPage from './pages/ChatPage';
import History from './pages/History';
import Memory from './pages/Memory';
import About from './pages/About';

function ChatPageWrapper() {
  const { conversationId, setConversationId, onRefreshSidebar } = useOutletContext();
  return (
    <ChatPage
      conversationId={conversationId}
      onConversationCreated={(id) => {
        setConversationId(id);
        if (onRefreshSidebar) onRefreshSidebar();
      }}
      onRefreshSidebar={onRefreshSidebar}
    />
  );
}

export default function App() {
  const [activeConversationId, setActiveConversationId] = useState(null);

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <Layout
              activeConversationId={activeConversationId}
              setActiveConversationId={setActiveConversationId}
            />
          }
        >
          <Route index element={<ChatPageWrapper />} />
          <Route path="history" element={<History />} />
          <Route path="memory" element={<Memory />} />
          <Route path="about" element={<About />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
