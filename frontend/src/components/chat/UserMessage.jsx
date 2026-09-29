import React from 'react';

export default function UserMessage({ content }) {
  return (
    <div className="user-message-row">
      <div className="user-bubble">
        {content}
      </div>
    </div>
  );
}
