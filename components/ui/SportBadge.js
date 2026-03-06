/**
 * Sport icon SVG components — inline from Figma exports.
 * Each renders at the given size with currentColor fill.
 */
function WingIcon({ size = 16, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 25 25"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M4.48803 19.3947C4.69488 19.6684 6.57999 21.4865 6.57999 21.4865C7.9999 22.5 8.84257 20.6938 8 20C8 20 7.06132 19.0991 6.57999 18.5C3.35664 14.4878 7.47884 10.2629 7.47884 10.2629C7.47884 10.2629 6.22116 9.01868 7.62714 7.54412C9.03756 6.34301 10.3954 7.59355 10.3954 7.59355C10.3954 7.59355 14.3722 3.24739 18.4529 6.95093C18.9779 7.42748 19.6887 8.03845 19.6887 8.03845C21.0728 8.97766 21.8233 7.22216 21.1716 6.6049C21.1716 6.6049 20.091 5.09544 19.1995 4.44335C15.2311 1.54082 10.6577 3.21474 6.9999 6.49999C3.15363 9.95447 1.37121 15.27 4.48803 19.3947Z"
        fill="currentColor"
      />
      <path
        d="M14.1571 15.4691C14.1571 15.4691 9.00841 10.8719 8.0627 9.76853C7.11698 8.66519 8.95555 7.16779 9.90134 8.19232L15.5231 14.2607C16.4426 15.2326 15.1028 16.4936 14.1571 15.4691Z"
        fill="currentColor"
      />
      <path
        d="M7.91652 11C7.91652 11 3.75408 14.9564 7.69781 18.5796C9.45278 20.192 6.56918 16.7391 13 15.4145L7.91652 11Z"
        fill="currentColor"
        fillOpacity="0.35"
      />
      <path
        d="M11.0186 8.10305C11.0186 8.10305 14.9344 4.10686 18.5957 7.81781C20.225 9.46919 16.7443 6.764 15.4822 12.8891L11.0186 8.10305Z"
        fill="currentColor"
        fillOpacity="0.35"
      />
    </svg>
  );
}

function KiteIcon({ size = 16, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M2.53467 15.4297C2.53467 15.4297 3.347 21.7021 8.47945 21.4792C9.6194 20.8899 7.40969 18.93 7.90975 16.907C5.46743 17.191 4.21787 16.7366 2.53467 15.4297Z"
        fill="currentColor"
      />
      <path
        d="M20.4043 6.85597C9.47949 6.47917 7.97949 15.9792 7.97949 15.9792C4.47949 16.4792 2.47949 13.9792 2.47949 13.9792C2.97972 8.97919 5.47949 6.85599 7.47949 5.47919C15.6024 -0.112624 20.4043 6.85597 20.4043 6.85597Z"
        fill="currentColor"
      />
      <path
        d="M17.9795 12.4792C17.9795 12.4792 17.8322 9.38297 15.7563 7.89384C15.7563 7.89384 17.9795 6.97918 20.9795 7.47918C20.9795 7.47918 23.1569 12.8576 17.9795 12.4792Z"
        fill="currentColor"
        fillOpacity="0.35"
      />
    </svg>
  );
}

function SurfIcon({ size = 16, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M17.7523 20.6743C12.278 18.3967 4.44625 13.7615 3.97949 4.47919L18.4795 19.4792C18.4795 19.4792 18.4956 20.9836 17.7523 20.6743Z"
        fill="currentColor"
      />
      <path
        d="M20.1723 18.1726C17.9947 12.6578 13.5028 4.74295 4.23047 4.10739L18.9642 18.8779C18.9642 18.8779 20.468 18.9214 20.1723 18.1726Z"
        fill="currentColor"
      />
    </svg>
  );
}

const SPORT_ICONS = {
  wingfoil: WingIcon,
  kitesurfing: KiteIcon,
  surfing: SurfIcon,
};

/**
 * SportBadge component - renders a sport icon.
 *
 * @param {"wingfoil"|"kitesurfing"|"surfing"} sport
 * @param {number} size - Icon size in px (default 14)
 * @param {string} className - Additional CSS classes
 */
export function SportBadge({ sport, size = 14, className = "" }) {
  if (!sport) return null;

  const IconComponent = SPORT_ICONS[sport];
  if (!IconComponent) return null;

  return (
    <span className={`inline-flex items-center ${className || "text-ink/30"}`}>
      <IconComponent size={size} />
    </span>
  );
}
