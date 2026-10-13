export default function SignInIllustration() {
  return (
    <div className="[display:none] [justify-content:center] lg:[display:flex] [width:100%] [max-width:320px] [height:auto]">
      <svg
        viewBox="0 0 320 220"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* =========================
            BOOKS — LEFT
        ========================== */}

        {/* Bottom book */}
        <path
          d="M32 169H76C79 169 81 171 81 174V179H38C34 179 31 176 31 173C31 171 31 169 32 169Z" stroke="#777" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="white"
        />

        {/* Middle book */}
        <path
          d="M29 162H73C77 162 79 164 79 167V171H35C31 171 28 168 28 165C28 164 28 163 29 162Z"
          stroke="#777"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="white"
        />

        {/* Top book */}
        <path
          d="M35 154H78C81 154 83 156 83 159V163H39C35 163 32 160 32 158C32 156 33 155 35 154Z"
          stroke="#777"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="white"
        />

        {/* Book page lines */}
        <path
          d="M38 157H69"
          stroke="#aaa"
          strokeWidth="1"
          strokeLinecap="round"
        />
        <path
          d="M34 165H69"
          stroke="#aaa"
          strokeWidth="1"
          strokeLinecap="round"
        />
        <path
          d="M37 173H70"
          stroke="#aaa"
          strokeWidth="1"
          strokeLinecap="round"
        />

        {/* =========================
            MAIN BROWSER WINDOW
        ========================== */}

        {/* Browser body */}
        <rect
          x="78"
          y="27"
          width="157"
          height="138"
          rx="7"
          stroke="#555"
          strokeWidth="1.6"
          fill="white"
        />

        {/* Browser top bar */}
        <path
          d="M79 45H234"
          stroke="#555"
          strokeWidth="1.4"
        />

        {/* Browser dots */}
        <circle cx="89" cy="36" r="2.2" fill="#555" />
        <circle cx="98" cy="36" r="2.2" fill="#555" />
        <circle cx="107" cy="36" r="2.2" fill="#555" />

        {/* =========================
            CHECKLIST
        ========================== */}

        {/* Checked box */}
        <rect
          x="93"
          y="61"
          width="14"
          height="14"
          rx="1.5"
          stroke="#555"
          strokeWidth="1.5"
          fill="white"
        />

        <path
          d="M96.5 68L100 71L104.5 65"
          stroke="#555"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* First text line */}
        <path
          d="M117 66H151"
          stroke="#555"
          strokeWidth="1.4"
          strokeLinecap="round"
        />

        <path
          d="M117 71H143"
          stroke="#aaa"
          strokeWidth="1"
          strokeLinecap="round"
        />

        {/* Second checkbox */}
        <rect
          x="93"
          y="88"
          width="14"
          height="14"
          rx="1.5"
          stroke="#555"
          strokeWidth="1.5"
          fill="white"
        />

        {/* Second text */}
        <path
          d="M117 93H149"
          stroke="#555"
          strokeWidth="1.4"
          strokeLinecap="round"
        />

        <path
          d="M117 98H143"
          stroke="#aaa"
          strokeWidth="1"
          strokeLinecap="round"
        />

        {/* Third checkbox */}
        <rect
          x="93"
          y="115"
          width="14"
          height="14"
          rx="1.5"
          stroke="#555"
          strokeWidth="1.5"
          fill="white"
        />

        {/* Third text */}
        <path
          d="M117 120H151"
          stroke="#555"
          strokeWidth="1.4"
          strokeLinecap="round"
        />

        <path
          d="M117 125H143"
          stroke="#aaa"
          strokeWidth="1"
          strokeLinecap="round"
        />

        {/* =========================
            BAR CHART — RIGHT
        ========================== */}

        {/* Small bar */}
        <rect
          x="181"
          y="125"
          width="10"
          height="20"
          stroke="#555"
          strokeWidth="1.4"
          fill="white"
        />

        {/* Medium bar */}
        <rect
          x="197"
          y="113"
          width="10"
          height="32"
          stroke="#555"
          strokeWidth="1.4"
          fill="white"
        />

        {/* Tall bar */}
        <rect
          x="213"
          y="100"
          width="10"
          height="45"
          stroke="#555"
          strokeWidth="1.4"
          fill="white"
        />

        {/* =========================
            PLANT — RIGHT
        ========================== */}

        {/* Pot */}
        <path
          d="M249 143H274L270 164H253L249 143Z"
          stroke="#555"
          strokeWidth="1.4"
          strokeLinejoin="round"
          fill="white"
        />

        {/* Pot top */}
        <path
          d="M247 142H276"
          stroke="#555"
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        {/* Stem */}
        <path
          d="M261 142C261 132 260 121 264 111"
          stroke="#555"
          strokeWidth="1.4"
          strokeLinecap="round"
        />

        {/* Main leaf */}
        <path
          d="M263 120C256 113 256 105 258 100C264 103 268 109 263 120Z"
          stroke="#555"
          strokeWidth="1.3"
          strokeLinejoin="round"
          fill="white"
        />

        {/* Upper leaf */}
        <path
          d="M264 111C266 101 273 96 279 95C278 103 273 109 264 111Z"
          stroke="#555"
          strokeWidth="1.3"
          strokeLinejoin="round"
          fill="white"
        />

        {/* Left leaf */}
        <path
          d="M260 129C253 127 248 121 248 115C255 116 260 121 260 129Z"
          stroke="#555"
          strokeWidth="1.3"
          strokeLinejoin="round"
          fill="white"
        />

        {/* Right leaf */}
        <path
          d="M263 132C269 128 274 122 275 116C269 117 264 122 263 132Z"
          stroke="#555"
          strokeWidth="1.3"
          strokeLinejoin="round"
          fill="white"
        />

        {/* =========================
            GROUND LINE
        ========================== */}

        <path
          d="M25 165H282"
          stroke="#aaa"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}