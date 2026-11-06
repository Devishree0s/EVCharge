import React from 'react';

export default function Empty({ text, children }) {
  return (
    <div className="empty">
      <p>{text}</p>
      {children}
    </div>
  );
}
