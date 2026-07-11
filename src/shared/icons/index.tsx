import type { ReactNode, SVGProps } from "react";

export type IconProps = SVGProps<SVGSVGElement> & { size?: number };

/* Icon paths are taken from the design handoff (hand-drawn 24x24, stroke 2-2.4,
   round caps). Colors are parametrized via currentColor. */
function icon(node: ReactNode) {
  return function Icon({ size = 24, ...rest }: IconProps) {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} fill="none" aria-hidden="true" {...rest}>
        {node}
      </svg>
    );
  };
}

const stroke = {
  stroke: "currentColor",
  fill: "none",
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

export const IconDumbbell = icon(
  <>
    <rect x="1.5" y="9" width="3.2" height="6" rx="1.3" fill="currentColor" />
    <rect x="5.3" y="7" width="3.2" height="10" rx="1.3" fill="currentColor" />
    <rect x="15.5" y="7" width="3.2" height="10" rx="1.3" fill="currentColor" />
    <rect x="19.3" y="9" width="3.2" height="6" rx="1.3" fill="currentColor" />
    <rect x="9" y="10.6" width="6" height="2.8" rx="1.2" fill="currentColor" />
  </>,
);

export const IconCamera = icon(
  <>
    <path
      d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.6l1.2-1.8A1.5 1.5 0 0 1 10.55 3.5h2.9a1.5 1.5 0 0 1 1.25.7L15.9 6h1.6A2.5 2.5 0 0 1 20 8.5v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5v-9z"
      {...stroke}
      strokeWidth="2"
    />
    <circle cx="12" cy="13" r="3.4" {...stroke} strokeWidth="2" />
  </>,
);

export const IconGeoPin = icon(
  <>
    <path
      d="M12 2.5a7 7 0 0 1 7 7c0 5-7 12.5-7 12.5S5 14.5 5 9.5a7 7 0 0 1 7-7z"
      {...stroke}
      strokeWidth="2"
    />
    <circle cx="12" cy="9.5" r="2.6" fill="currentColor" />
  </>,
);

export const IconGeoPinFilled = icon(
  <>
    <path d="M12 2a7 7 0 0 1 7 7c0 5-7 13-7 13S5 14 5 9a7 7 0 0 1 7-7z" fill="currentColor" />
    <circle cx="12" cy="9" r="2.6" fill="var(--icon-contrast, #fff)" />
  </>,
);

export const IconLock = icon(
  <>
    <rect x="5.5" y="10.5" width="13" height="9" rx="2.5" fill="currentColor" />
    <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" {...stroke} strokeWidth="2.2" />
  </>,
);

export const IconLockKeyhole = icon(
  <>
    <rect x="5.5" y="10.5" width="13" height="9" rx="2.5" {...stroke} strokeWidth="2" />
    <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" {...stroke} strokeWidth="2" />
    <circle cx="12" cy="14.6" r="1.5" fill="currentColor" />
  </>,
);

export const IconKey = icon(
  <>
    <circle cx="9" cy="12" r="4" {...stroke} strokeWidth="2.2" />
    <path d="M13 12h8M18 12v3.5M21 12v2.5" {...stroke} strokeWidth="2.2" />
  </>,
);

export const IconCheck = icon(
  <path d="M5.5 12.5l4.2 4.2L18.5 7.5" {...stroke} strokeWidth="2.6" />,
);

export const IconCheckBold = icon(<path d="M4.5 12.5l5 5L19.5 7" {...stroke} strokeWidth="3" />);

export const IconCheckCircle = icon(
  <>
    <circle cx="12" cy="12" r="10" fill="currentColor" />
    <path
      d="M8 12.5l2.6 2.6L16 9.5"
      {...stroke}
      stroke="var(--icon-contrast, #fff)"
      strokeWidth="2.6"
    />
  </>,
);

export const IconCross = icon(
  <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" {...stroke} strokeWidth="2.6" />,
);

export const IconClock = icon(
  <>
    <circle cx="12" cy="12" r="9" {...stroke} strokeWidth="2.2" />
    <path d="M12 7.5V12l3 2.5" {...stroke} strokeWidth="2.2" />
  </>,
);

export const IconLightning = icon(
  <path d="M13 2L5 13.5h5L9 22l8-11.5h-5L13 2z" fill="currentColor" />,
);

export const IconFire = icon(
  <path
    d="M12 2.5c2.3 3 6 5.6 6 9.9a6 6 0 0 1-12 0c0-2 .9-3.7 2.1-5.2.4 1.2 1.1 2.2 2 2.7-.3-2.5.6-5.3 1.9-7.4z"
    fill="currentColor"
  />,
);

export const IconStar = icon(
  <path
    d="M12 2.5l2.6 6.2 6.7.5-5.1 4.4 1.6 6.5L12 16.6l-5.8 3.5 1.6-6.5-5.1-4.4 6.7-.5L12 2.5z"
    fill="currentColor"
  />,
);

export const IconMedal = icon(
  <>
    <circle cx="12" cy="14.5" r="4.6" {...stroke} strokeWidth="2.2" />
    <path d="M8.5 3.5l2.3 5M15.5 3.5l-2.3 5" {...stroke} strokeWidth="2.2" />
  </>,
);

export const IconTrophy = icon(
  <>
    <path d="M7.5 4h9v3.6a4.5 4.5 0 0 1-9 0V4z" {...stroke} strokeWidth="2" />
    <path
      d="M7.5 5.2H5a2.6 2.6 0 0 0 2.9 3.4M16.5 5.2H19a2.6 2.6 0 0 1-2.9 3.4"
      {...stroke}
      strokeWidth="1.8"
    />
    <path d="M10.8 12h2.4v3h-2.4z" fill="currentColor" />
    <rect x="8.2" y="15.6" width="7.6" height="2.6" rx="1.2" fill="currentColor" />
  </>,
);

export const IconClipboard = icon(
  <>
    <rect x="8" y="3" width="8" height="4" rx="1.5" {...stroke} strokeWidth="2" />
    <path
      d="M8 5H6.5A1.5 1.5 0 0 0 5 6.5v13A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5v-13A1.5 1.5 0 0 0 17.5 5H16"
      {...stroke}
      strokeWidth="2"
    />
  </>,
);

export const IconShare = icon(
  <>
    <path d="M12 3v12M12 3l-4 4M12 3l4 4" {...stroke} strokeWidth="2.4" />
    <rect x="5" y="13" width="14" height="8" rx="2.5" {...stroke} strokeWidth="2.2" />
  </>,
);

export const IconLink = icon(
  <>
    <path
      d="M10 13.5a4 4 0 0 0 6 .5l2.5-2.5a4 4 0 0 0-5.7-5.7L11.5 7"
      {...stroke}
      strokeWidth="2.2"
    />
    <path
      d="M14 10.5a4 4 0 0 0-6-.5L5.5 12.5a4 4 0 0 0 5.7 5.7l1.3-1.2"
      {...stroke}
      strokeWidth="2.2"
    />
  </>,
);

export const IconGlobe = icon(
  <>
    <circle cx="12" cy="12" r="9" {...stroke} strokeWidth="2" />
    <path
      d="M3.5 12h17M12 3.5c2.5 2.3 3.8 5.2 3.8 8.5s-1.3 6.2-3.8 8.5c-2.5-2.3-3.8-5.2-3.8-8.5s1.3-6.2 3.8-8.5z"
      {...stroke}
      strokeWidth="2"
    />
  </>,
);

export const IconRooms = icon(
  <>
    <rect x="3" y="3" width="8" height="8" rx="2.5" fill="currentColor" />
    <rect x="13" y="3" width="8" height="8" rx="2.5" fill="currentColor" />
    <rect x="3" y="13" width="8" height="8" rx="2.5" fill="currentColor" />
    <rect x="13" y="13" width="8" height="8" rx="2.5" fill="currentColor" opacity=".5" />
  </>,
);

export const IconPerson = icon(
  <>
    <circle cx="12" cy="8" r="4" fill="currentColor" />
    <rect x="4" y="14" width="16" height="7" rx="3.5" fill="currentColor" />
  </>,
);

export const IconMenuDots = icon(
  <>
    <circle cx="6" cy="12" r="1.9" fill="currentColor" />
    <circle cx="12" cy="12" r="1.9" fill="currentColor" />
    <circle cx="18" cy="12" r="1.9" fill="currentColor" />
  </>,
);

export const IconChevronDown = icon(<path d="M6 10l6 5 6-5" {...stroke} strokeWidth="2.4" />);

export const IconChevronLeft = icon(<path d="M14 6l-6 6 6 6" {...stroke} strokeWidth="2.4" />);

export const IconChevronRight = icon(<path d="M9 6l6 6-6 6" {...stroke} strokeWidth="2.4" />);

export const IconPlus = icon(<path d="M12 5v14M5 12h14" {...stroke} strokeWidth="2.6" />);

export const IconMinus = icon(<path d="M5 12h14" {...stroke} strokeWidth="2.6" />);

export const IconImage = icon(
  <>
    <rect x="3" y="4.5" width="18" height="15" rx="2.5" {...stroke} strokeWidth="1.9" />
    <path d="M3.5 17l4.5-4.5 3.5 3.5 4-5 5 6" {...stroke} strokeWidth="1.9" />
  </>,
);

export const IconCloudOff = icon(
  <>
    <path
      d="M7.5 18a4.5 4.5 0 0 1-.4-9A5.5 5.5 0 0 1 17.8 10a3.75 3.75 0 0 1-.3 7.5"
      {...stroke}
      strokeWidth="2"
    />
    <path d="M4 4l16 16" {...stroke} strokeWidth="2.2" />
  </>,
);

export const IconLeave = icon(
  <>
    <path
      d="M14 7V5.5A1.5 1.5 0 0 0 12.5 4h-6A1.5 1.5 0 0 0 5 5.5v13A1.5 1.5 0 0 0 6.5 20h6a1.5 1.5 0 0 0 1.5-1.5V17"
      {...stroke}
      strokeWidth="2.1"
    />
    <path d="M10 12h10M17 8.5l3.5 3.5L17 15.5" {...stroke} strokeWidth="2.1" />
  </>,
);

export const IconUserCheck = icon(
  <>
    <circle cx="9" cy="8" r="3.2" {...stroke} strokeWidth="1.9" />
    <path d="M3.5 19c.7-3 2.9-4.6 5.5-4.6s4.8 1.6 5.5 4.6" {...stroke} strokeWidth="1.9" />
    <path d="M15.5 9.5l1.8 1.8 3.2-3.6" {...stroke} strokeWidth="2.2" />
  </>,
);

export const IconExpand = icon(
  <path
    d="M4 9V5.5A1.5 1.5 0 0 1 5.5 4H9M20 9V5.5A1.5 1.5 0 0 0 18.5 4H15M4 15v3.5A1.5 1.5 0 0 0 5.5 20H9M20 15v3.5a1.5 1.5 0 0 1-1.5 1.5H15"
    {...stroke}
    strokeWidth="2"
  />,
);

export const IconInfo = icon(
  <>
    <circle cx="12" cy="12" r="9" {...stroke} strokeWidth="2" />
    <path d="M12 11v5" {...stroke} strokeWidth="2.4" />
    <circle cx="12" cy="7.6" r="1.4" fill="currentColor" />
  </>,
);

export const IconTarget = icon(
  <>
    <circle cx="12" cy="12" r="9" {...stroke} strokeWidth="2" />
    <circle cx="12" cy="12" r="5" {...stroke} strokeWidth="2" />
    <circle cx="12" cy="12" r="1.7" fill="currentColor" />
  </>,
);

export const IconUsers = icon(
  <>
    <circle cx="8.5" cy="8" r="3.3" {...stroke} strokeWidth="1.9" />
    <path d="M3.4 18.6c.6-2.9 2.6-4.6 5.1-4.6s4.5 1.7 5.1 4.6" {...stroke} strokeWidth="1.9" />
    <path d="M15.4 5.5a3 3 0 0 1 0 5.7M16.6 14.2c1.9.2 3.4 1.6 4 4" {...stroke} strokeWidth="1.9" />
  </>,
);

export const IconCalendar = icon(
  <>
    <rect x="4" y="5" width="16" height="15" rx="2.6" {...stroke} strokeWidth="2" />
    <path d="M4 9.3h16M8 3.5v3.4M16 3.5v3.4" {...stroke} strokeWidth="2" />
  </>,
);

export const IconActivity = icon(
  <path d="M3 12.5h3.7l2.4-6.5 3.8 12 2.5-5.5H21" {...stroke} strokeWidth="2.2" />,
);

export const IconSparkles = icon(
  <>
    <path d="M12 3l1.7 4.4L18 9l-4.3 1.6L12 15l-1.7-4.4L6 9l4.3-1.6L12 3z" fill="currentColor" />
    <path d="M18.4 13.6l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2z" fill="currentColor" />
  </>,
);
