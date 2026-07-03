/**
 * Topographic contour pattern for auth brand panels.
 * A nod to Mayon Volcano's contour maps — distinctive to Legazpi City.
 */
const TopoPattern = () => (
  <svg
    className="absolute inset-0 w-full h-full opacity-[0.07]"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <defs>
      <pattern
        id="topo-pattern"
        x="0"
        y="0"
        width="200"
        height="200"
        patternUnits="userSpaceOnUse"
      >
        {/* Concentric irregular contour lines */}
        <path
          d="M100 20 Q140 30 160 60 Q175 90 160 130 Q140 170 100 180 Q60 170 40 130 Q25 90 40 60 Q60 30 100 20Z"
          fill="none"
          stroke="white"
          strokeWidth="1"
        />
        <path
          d="M100 45 Q130 52 145 72 Q155 95 145 120 Q130 148 100 155 Q70 148 55 120 Q45 95 55 72 Q70 52 100 45Z"
          fill="none"
          stroke="white"
          strokeWidth="1"
        />
        <path
          d="M100 65 Q120 70 130 82 Q137 98 130 112 Q120 128 100 133 Q80 128 70 112 Q63 98 70 82 Q80 70 100 65Z"
          fill="none"
          stroke="white"
          strokeWidth="1"
        />
        <path
          d="M100 82 Q112 85 118 92 Q122 100 118 108 Q112 115 100 118 Q88 115 82 108 Q78 100 82 92 Q88 85 100 82Z"
          fill="none"
          stroke="white"
          strokeWidth="0.75"
        />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#topo-pattern)" />
  </svg>
);

export default TopoPattern;
