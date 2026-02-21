import { SVGProps } from 'react';

const GroupIcon = ({ className, ...props }: SVGProps<SVGSVGElement> & { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    width={24}
    height={24}
    {...props}
  >
    {/* Center person */}
    <circle cx="12" cy="7" r="3" />
    <path d="M12 13c-3.5 0-6 2-6 4v1h12v-1c0-2-2.5-4-6-4z" />
    {/* Left person */}
    <circle cx="5" cy="9" r="2.5" />
    <path d="M5 14c-2.5 0-4.5 1.5-4.5 3v1H7" />
    {/* Right person */}
    <circle cx="19" cy="9" r="2.5" />
    <path d="M19 14c2.5 0 4.5 1.5 4.5 3v1H17" />
  </svg>
);

export default GroupIcon;
