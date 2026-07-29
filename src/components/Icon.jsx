import React from 'react';

const PATHS = {
  check: <path d="m5 12 4 4L19 6" />,
  chevronDown: <path d="m7 10 5 5 5-5" />,
  close: <path d="m7 7 10 10M17 7 7 17" />,
  copy: <path d="M9 9h10v10H9zM5 15H4V5h10v1" />,
  document: <path d="M7 3h7l4 4v14H7zM14 3v5h5M10 12h6M10 16h6" />,
  download: <path d="M12 3v12m0 0 4-4m-4 4-4-4M5 20h14" />,
  edit: <path d="m4 20 4.2-1 10.6-10.6-3.2-3.2L5 15.8 4 20ZM13.8 7l3.2 3.2" />,
  externalFile: <path d="M7 3h7l4 4v5M14 3v5h5M12 13H5v8h8v-7m-3 3 9-9m-5 0h5v5" />,
  filePlus: <path d="M7 3h7l4 4v14H7zM14 3v5h5M12 11v6m-3-3h6" />,
  folder: <path d="M3 6h7l2 2h9v11H3z" />,
  help: <path d="M9.2 9a3 3 0 1 1 4.2 2.7c-.9.4-1.4 1-1.4 2.3m0 3.2v.1M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z" />,
  highlight: <path d="m7 4 10 10-4 4L3 8l4-4Zm-2 6-2 6 6-2M14 20h7" />,
  image: <path d="M4 5h16v14H4zM8 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm-4 7 5-5 3 3 2-2 6 6" />,
  link: <path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.2 1.2M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.2-1.2" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  moon: <path d="M20 15.3A8.5 8.5 0 0 1 8.7 4 8.5 8.5 0 1 0 20 15.3Z" />,
  more: <path d="M5 12h.1M12 12h.1M19 12h.1" />,
  outline: <path d="M4 6h2m3 0h11M4 12h2m3 0h11M4 18h2m3 0h11" />,
  preview: <><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6Z" /><circle cx="12" cy="12" r="2.5" /></>,
  refresh: <path d="M20 7v5h-5M4 17v-5h5M6.1 8A7 7 0 0 1 18.4 6M17.9 16A7 7 0 0 1 5.6 18" />,
  save: <path d="M5 3h12l2 2v16H5zM8 3v6h8V3M8 21v-8h8v8" />,
  search: <path d="m20 20-4.5-4.5M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z" />,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21h-4v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3.1 14H3v-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5V3h4v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.1v4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></>,
  split: <path d="M4 4h16v16H4zM12 4v16" />,
  sun: <><circle cx="12" cy="12" r="3.5" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  timestamp: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  unlock: <path d="M7 11V8a5 5 0 0 1 9.7-1.7M5 11h14v10H5z" />,
  bold: <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6zM6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />,
  italic: <path d="M19 4h-9M14 20H5M15 4L9 20" />,
  strikethrough: <path d="M16 4H9a3 3 0 0 0-3 3c0 2 1.5 3 3.5 3.5M4 12h16M15 20h-7a3 3 0 0 1-3-3" />,
  code: <path d="m16 18 6-6-6-6M8 6l-6 6 6 6" />,
  table: <path d="M3 5h18v14H3zM3 10h18M10 5v14" />,
  list: <path d="M8 6h13M8 12h13M8 18h13M3 6h.1M3 12h.1M3 18h.1" />,
  quote: <path d="M3 21c3 0 7-1 7-8V5H3v8h4c0 3-2 5-4 5zm11 0c3 0 7-1 7-8V5h-7v8h4c0 3-2 5-4 5z" />,
};

export default function Icon({ name, size = 16, className = '', ...props }) {
  return (
    <svg
      aria-hidden="true"
      className={['chrome-icon', className].filter(Boolean).join(' ')}
      fill="none"
      focusable="false"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      {...props}
    >
      <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7">
        {PATHS[name] || PATHS.document}
      </g>
    </svg>
  );
}
