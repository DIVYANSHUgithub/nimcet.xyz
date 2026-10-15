// import { useNavigate } from 'react-router-dom'
// import SearchBar from './SearchBar'
// import PopularSearches from './PopularSearches'
// import HighlightQuestion from './HighlightQuestion'
// import Container from './ui/Container'

// export default function Hero({ topics = [], searchableItems = [] }) {
//   const navigate = useNavigate()
//   const runSearch = (value) => {
//     const term = String(value ?? '').trim()
//     const params = new URLSearchParams()
//     if (term) params.set('search', term)
//     navigate(`/questions${params.size ? `?${params.toString()}` : ''}`)
//   }

//   return (
//     <section className="overflow-hidden bg-surface py-12 sm:py-16 lg:py-20">
//       <Container className="grid items-center gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:gap-14">
//         <div className="min-w-0 max-w-2xl">
//           <p className="text-xs font-bold tracking-[0.12em] text-accent">YOUR NIMCET PREPARATION PARTNER</p>
//           <h1 className="mt-4 max-w-2xl text-4xl font-bold leading-tight tracking-tight text-ink-heading sm:text-5xl lg:text-[3.5rem]">
//             Prepare for NIMCET.<br />One question at a time.
//           </h1>
//           <p className="mt-5 max-w-xl text-base leading-7 text-ink-muted sm:text-lg">
//             Practice topic-wise questions, understand detailed solutions, and build confidence for NIMCET.
//           </p>
//           <div className="mt-6 max-w-xl">
//             {/* <SearchBar onSearch={runSearch} placeholder="Search questions, topics, or subjects..." searchableItems={searchableItems} />
//           </div>
//           <div className="mt-5">
//             {topics.length > 0 && <PopularSearches items={topics} onSelect={runSearch} />} */}
//           </div>
//         </div>

//         <div className="min-w-0 lg:justify-self-end">
//           <div className="mb-4">
//             <p className="text-xs font-bold tracking-[0.12em] text-accent">FROM THE QUESTION BANK</p>
//             <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink-heading">TODAY's CHALLENGE</h2>
//             <p className="mt-1 text-sm leading-6 text-ink-muted">Review a published question with its answer key and explanation.</p>
//           </div>
//           <HighlightQuestion />
//         </div>
//       </Container>
//     </section>
//   )
// }

import { useNavigate } from 'react-router-dom'
import HighlightQuestion from './HighlightQuestion'
import Container from './ui/Container'

const benefits = [
  {
    icon: 'book-open',
    title: 'Topic-wise Practice',
    description: 'Master every concept step by step',
    color: 'blue',
  },
  {
    icon: 'chart',
    title: 'Detailed Solutions',
    description: 'Learn the right approach every time',
    color: 'green',
  },
  {
    icon: 'target',
    title: 'Track Your Progress',
    description: 'Identify strengths and weak topics',
    color: 'violet',
  },
  {
    icon: 'bulb',
    title: 'Build Confidence',
    description: 'Be exam-ready with consistent practice',
    color: 'orange',
  },
]

function BenefitIcon({ type }) {
  const paths = {
    'book-open': (
      <>
        <path d="M12 7v14" />
        <path d="M12 7C9 4.5 5.5 4 3 5v14c3-1 6-.5 9 2" />
        <path d="M12 7c3-2.5 6.5-3 9-2v14c-3-1-6-.5-9 2" />
      </>
    ),
    chart: (
      <>
        <path d="M3 20h18" />
        <rect x="5" y="12" width="3" height="6" rx="1" />
        <rect x="11" y="8" width="3" height="10" rx="1" />
        <rect x="17" y="4" width="3" height="14" rx="1" />
        <path d="m5 9 5-4 4 2 5-4" />
      </>
    ),
    target: (
      <>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="12" cy="12" r="1.5" />
        <path d="m13 11 7-7" />
        <path d="M16 4h4v4" />
      </>
    ),
    bulb: (
      <>
        <path d="M9 18h6M10 21h4" />
        <path d="M8.5 14.5a7 7 0 1 1 7 0c-.8.6-1.3 1.5-1.5 2.5h-4c-.2-1-.7-1.9-1.5-2.5Z" />
        <path d="M12 5v3m-4 0 2 2" />
      </>
    ),
  }

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-7 w-7"
    >
      {paths[type]}
    </svg>
  )
}

// function StudentIllustration() {
//   return (
//     <svg
//       viewBox="0 0 560 270"
//       fill="none"
//       xmlns="http://www.w3.org/2000/svg"
//       role="img"
//       aria-label="Illustration of a student studying at a laptop"
//       className="h-auto w-full max-w-[560px]"
//     >
//       <ellipse cx="290" cy="155" rx="178" ry="104" fill="#EAF2FF" />

//       {/* Checklist */}
//       <g transform="rotate(-12 190 76)" stroke="#101827" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
//         <rect x="155" y="34" width="62" height="91" rx="6" fill="white" />
//         <path d="m165 54 4 4 7-9M182 54h22" />
//         <path d="m165 71 4 4 7-9M182 71h22" />
//         <path d="m165 88 4 4 7-9M182 88h22" />
//         <path d="M178 34v-6m14 6v-7" />
//       </g>

//       {/* Books */}
//       <path d="M82 226h103v17H82c-9 0-14-4-14-9s5-8 14-8Z" fill="#D6E5F9" stroke="#111827" strokeWidth="2" />
//       <path d="M82 245h103v15H82c-9 0-14-3-14-8s5-7 14-7Z" fill="#fff" stroke="#111827" strokeWidth="2" />
//       <path d="M92 232h70m-70 19h70" stroke="#A7B8CE" strokeWidth="2" />

//       {/* Plant */}
//       <path d="M105 226c-9-20-4-30 2-34 9 13 8 23-2 34Z" fill="#C9E7D4" stroke="#111827" strokeWidth="1.8" />
//       <path d="M109 226c0-18 9-26 17-26 0 12-5 22-17 26Z" fill="#C9E7D4" stroke="#111827" strokeWidth="1.8" />
//       <path d="M110 226v-19" stroke="#111827" strokeWidth="1.8" />

//       {/* Student body */}
//       <path d="M206 241c4-39 19-63 47-73l40 9c28 12 44 36 53 64Z" fill="white" stroke="#111827" strokeWidth="2.5" strokeLinejoin="round" />
//       <path d="M240 177c8 17 26 24 43 20l-13 44h-30l-13-43Z" fill="#E8EEF6" stroke="#111827" strokeWidth="2" />

//       {/* Head and hair */}
//       <path d="M249 116c-5-24 9-42 32-42 24 0 38 16 34 40l-7 27c-5 15-17 24-29 24-15 0-27-15-30-31Z" fill="#FFF" stroke="#111827" strokeWidth="2.5" />
//       <path d="M248 118c-13-9-9-31 3-42 9-9 23-13 38-10 17 2 28 12 29 25 1 11-6 17-14 18-10 2-16-4-22-10-8 10-20 16-34 19Z" fill="#111827" />
//       <path d="M261 126h1m29 0h1" stroke="#111827" strokeWidth="4" strokeLinecap="round" />
//       <path d="M271 141c5 4 11 4 16-1" stroke="#111827" strokeWidth="2" strokeLinecap="round" />
//       <path d="M256 113c-10-4-13 8-6 14m64-14c10-4 12 8 5 14" stroke="#111827" strokeWidth="2" />

//       {/* Arms and laptop */}
//       <path d="M218 199c-14 14-18 28-7 36 8 6 22 0 35-10l20-17" fill="white" stroke="#111827" strokeWidth="2.5" strokeLinecap="round" />
//       <path d="M307 201c20 9 32 20 26 29-5 8-17 4-31-4l-20-12" fill="white" stroke="#111827" strokeWidth="2.5" strokeLinecap="round" />
//       <path d="M289 203h98l-18 48h-98Z" fill="#FFF" stroke="#111827" strokeWidth="2.5" strokeLinejoin="round" />
//       <path d="M263 251h106l10 5H253Z" fill="#DCE5F0" stroke="#111827" strokeWidth="2" />
//       <circle cx="331" cy="226" r="4" fill="#D7E5F7" />

//       {/* Small chart */}
//       <g stroke="#111827" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
//         <path d="M405 177h45" />
//         <rect x="409" y="154" width="7" height="23" fill="#D6E5F9" />
//         <rect x="423" y="143" width="7" height="34" fill="#D6E5F9" />
//         <rect x="437" y="130" width="7" height="47" fill="#D6E5F9" />
//       </g>

//       {/* Sparkles */}
//       <path d="m445 78 6-12m6 22 12-3m-24 13 8 8" stroke="#111827" strokeWidth="2" strokeLinecap="round" />
//       <path d="m132 137-6-8m-4 21-10 1" stroke="#111827" strokeWidth="2" strokeLinecap="round" />

//       {/* Ground */}
//       <path d="M52 260h430" stroke="#AAB8C8" strokeWidth="2" strokeLinecap="round" />
//     </svg>
//   )
// }


// function StudentIllustration() {
//   const ink = '#202b3a'
//   const paper = '#ffffff'
//   const hoodie = '#f5f5f5'
//   const paleBlue = '#f1f4ff'

//   return (
//     <svg
//       viewBox="0 0 620 252"
//       xmlns="http://www.w3.org/2000/svg"
//       fill="none"
//       role="img"
//       aria-label="A student studying at a laptop, with books, a checklist, a lightbulb and the words Small Steps Big Results"
//       className="block h-auto w-full"
//       strokeLinecap="round"
//       strokeLinejoin="round"
//     >
//       {/* Background and soft halo */}
//       <rect width="620" height="252" fill={paper} />
//       <ellipse cx="365" cy="153" rx="180" ry="105" fill={paleBlue} />

//       {/* Handwritten motto */}
//       <g
//         transform="rotate(-9 65 85)"
//         fill="#78859b"
//         fontFamily="'Segoe Print', 'Comic Sans MS', cursive"
//         fontSize="17"
//         fontStyle="italic"
//       >
//         <text x="42" y="66">Small</text>
//         <text x="52" y="85">Steps</text>
//         <text x="38" y="104">Big Results</text>
//       </g>

//       {/* Subtle progress arrows */}
//       <g stroke="#dce2ec" strokeWidth="1.7">
//         <path d="M126 86c10-1 18 3 24 9" />
//         <path d="m143 89 7 6-9 2" />
//       </g>

//       {/* Checklist floating above the student */}
//       <g
//         transform="rotate(8 236 58)"
//         stroke={ink}
//         strokeWidth="3"
//       >
//         <rect x="207" y="18" width="55" height="73" rx="5" fill={paper} />
//         <rect x="225" y="12" width="19" height="12" rx="3" fill={paper} />

//         <path d="m216 39 5 5 8-9" />
//         <path d="M235 39h19" />

//         <path d="m216 55 5 5 8-9" />
//         <path d="M235 55h19" />

//         <path d="m216 71 5 5 8-9" />
//         <path d="M235 71h19" />
//       </g>

//       {/* Checklist decorative strokes */}
//       <g stroke={ink} strokeWidth="2">
//         <path d="m285 28 5-7m8 15 8-3m-15 12 7-1" />
//         <path d="m445 26-4-10m12 23 8-4m-6 17 9 2" />
//       </g>

//       {/* Lightbulb */}
//       <g stroke={ink} strokeWidth="2.2">
//         <path
//           d="M170 112a10 10 0 1 1 20 0c0 5-4 8-6 12h-8c-2-4-6-7-6-12Z"
//           fill="#ffe58a"
//         />
//         <path d="M177 126h6m-5 4h4" />
//         <path d="M180 96v-5m-13 10-4-4m30 4 4-4" />
//       </g>

//       {/* Books at the lower left */}
//       <g stroke={ink} strokeWidth="3">
//         <rect x="104" y="207" width="108" height="19" rx="3" fill="#374151" />
//         <path d="M203 209v15" stroke="#aeb8c7" strokeWidth="2" />

//         <rect x="96" y="226" width="116" height="17" rx="3" fill="#4b5563" />
//         <path d="M203 228v13" stroke="#aeb8c7" strokeWidth="2" />

//         <rect x="91" y="243" width="121" height="15" rx="3" fill="#374151" />
//         <path d="M203 245v11" stroke="#aeb8c7" strokeWidth="2" />
//       </g>

//       {/* Plant emerging from the books */}
//       <g stroke={ink} strokeWidth="2">
//         <path d="M148 207c-13-11-15-21-9-27 12 7 16 16 9 27Z" fill="#9bd4ad" />
//         <path d="M150 207c3-15 13-21 23-18-1 12-9 19-23 18Z" fill="#81c99c" />
//         <path d="M149 207c-5-10-3-19 3-24 7 9 5 17-3 24Z" fill="#b1dfbd" />
//         <path d="M149 207v-16" strokeWidth="1.5" />
//       </g>

//       {/* Bar chart behind the student */}
//       <g stroke={ink} strokeWidth="3">
//         <path d="M402 148V95" />
//         <rect x="407" y="125" width="8" height="23" fill="#dce7f8" />
//         <rect x="421" y="110" width="8" height="38" fill="#dce7f8" />
//         <rect x="435" y="88" width="8" height="60" fill="#dce7f8" />
//       </g>

//       {/* Student's body: wider torso and relaxed seated posture */}
//       <g stroke={ink} strokeWidth="3" strokeLinejoin="round">
//         <path
//           d="
//             M280 137
//             C266 143 252 154 244 170
//             C237 184 237 198 249 204
//             L281 210
//             L305 193
//             L298 177
//             C313 184 331 189 346 186
//             C362 183 372 173 377 164
//             L356 146
//             C345 139 333 133 318 132
//             Z
//           "
//           fill={hoodie}
//         />

//         {/* Hood around the neck */}
//         <path
//           d="M281 137c8 13 22 21 36 20l-10 17c-16-5-26-17-26-37Z"
//           fill="#e7e9ee"
//         />

//         {/* Neck */}
//         <path
//           d="M320 116v17c-3 8-12 11-18 7l-3-17"
//           fill={paper}
//         />

//         {/* Collar and hoodie seam */}
//         <path d="M286 142c9 10 18 13 28 14" strokeWidth="2" />
//         <path d="M317 158v21m9-20v18" strokeWidth="2" />

//         {/* Sleeve seam */}
//         <path d="M264 165c-9 9-16 18-17 28" strokeWidth="2" />
//       </g>

//       {/* Student's head and ears */}
//       <g stroke={ink} strokeWidth="3" strokeLinejoin="round">
//         <path
//           d="
//             M302 72
//             C298 56 309 43 326 42
//             C346 41 360 55 357 76
//             L353 93
//             C350 108 340 118 328 118
//             C314 117 302 104 300 89
//             L296 84
//             C289 76 295 70 302 72Z
//           "
//           fill={paper}
//         />

//         {/* Hair silhouette */}
//         <path
//           d="
//             M300 76
//             C293 62 300 46 316 40
//             C330 35 347 40 355 51
//             C365 65 357 77 352 82
//             C345 73 336 70 329 65
//             C322 75 311 80 300 76Z
//           "
//           fill={ink}
//         />

//         {/* Ear */}
//         <path d="M301 76c-8-4-12 4-5 11l7 2" fill={paper} />

//         {/* Face */}
//         <path d="M328 76h1m13 2h1" strokeWidth="4" />
//         <path d="M331 88c4 4 9 4 13 0" strokeWidth="2" />
//       </g>

//       {/* Left arm: bent inward towards the work surface */}
//       <g stroke={ink} strokeWidth="3" strokeLinejoin="round">
//         <path
//           d="
//             M281 139
//             C265 146 249 158 238 173
//             C231 183 228 192 236 198
//             C244 204 261 204 278 202
//             L296 192
//             L289 182
//             L266 191
//             L253 192
//             C263 179 276 168 291 160
//             Z
//           "
//           fill={hoodie}
//         />

//         {/* Left wrist and hand */}
//         <path
//           d="
//             M278 202
//             C284 198 292 198 298 202
//             L308 207
//             L293 211
//             L275 210
//             C270 208 273 204 278 202Z
//           "
//           fill={paper}
//         />

//         {/* Finger details */}
//         <path d="M280 207l11 1m-8-4 10 2" strokeWidth="1.6" />
//       </g>

//       {/* Right arm: follows the shoulder down towards the keyboard */}
//       <g stroke={ink} strokeWidth="3" strokeLinejoin="round">
//         <path
//           d="
//             M345 139
//             C358 146 369 156 377 169
//             L393 179
//             L386 190
//             C372 184 360 177 350 166
//             L337 154
//             Z
//           "
//           fill={hoodie}
//         />

//         {/* Wrist resting on the keyboard */}
//         <path
//           d="
//             M386 188
//             C392 185 398 188 402 192
//             L408 197
//             L394 199
//             L382 195
//             Z
//           "
//           fill={paper}
//         />

//         {/* Fingers */}
//         <path d="M390 194l10 1m-6-4 9 1" strokeWidth="1.7" />
//       </g>

//       {/* Laptop screen */}
//       <g stroke={ink} strokeWidth="3" strokeLinejoin="round">
//         <path
//           d="M397 145L512 152L502 205L386 198Z"
//           fill="#e4e8ee"
//         />

//         {/* Screen inset */}
//         <path
//           d="M405 152L504 158L497 192L399 187Z"
//           fill="#f9fafb"
//           strokeWidth="1.7"
//         />

//         {/* Camera */}
//         <circle cx="451" cy="173" r="4" fill={paper} strokeWidth="1.8" />

//         {/* Laptop base */}
//         <path
//           d="M386 198L502 205L518 218L372 218Z"
//           fill="#d3d9e2"
//         />

//         {/* Keyboard surface */}
//         <path d="M391 202L498 208" stroke="#a6afbd" strokeWidth="1.5" />
//         <path d="M424 207h29l-2 4h-29Z" stroke="#a6afbd" strokeWidth="1.2" />
//       </g>

//       {/* Shared ground line */}
//       <path d="M28 258H592" stroke="#e0e5ed" strokeWidth="2" />
//     </svg>
//   )
// }


export default function Hero() {
  const navigate = useNavigate()

  return (
    <section className="relative overflow-hidden bg-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_15%_85%,rgba(99,102,241,0.07),transparent_34%),radial-gradient(ellipse_at_85%_75%,rgba(56,189,248,0.08),transparent_34%)]" />

      <Container className="relative grid items-start gap-12 pb-8 pt-14 sm:pt-16 lg:grid-cols-[1.02fr_0.98fr] lg:gap-14 lg:pt-20">
        <div className="min-w-0">
          <p className="text-xs font-bold tracking-[0.16em] text-blue-600 sm:text-sm">
            YOUR NIMCET PREPARATION PARTNER
          </p>

          <h1 className="mt-6 max-w-3xl text-4xl font-extrabold leading-[1.08] tracking-[-0.045em] text-slate-950 sm:text-5xl lg:text-[3.9rem]">
            Prepare for NIMCET.
            <br />
            One question at a time.
          </h1>

          <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
            Practice topic-wise questions, understand detailed solutions,
            and build confidence for NIMCET.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-6 sm:grid-cols-4 lg:gap-x-4">
            {benefits.map((benefit) => (
              <div key={benefit.title} className="min-w-0">
                <div
                  className={`mb-3 flex h-12 w-12 items-center justify-center rounded-xl ${
                    benefit.color === 'blue'
                      ? 'bg-blue-50 text-blue-600'
                      : benefit.color === 'green'
                        ? 'bg-emerald-50 text-emerald-600'
                        : benefit.color === 'violet'
                          ? 'bg-violet-50 text-violet-600'
                          : 'bg-orange-50 text-orange-600'
                  }`}
                >
                  <BenefitIcon type={benefit.icon} />
                </div>
                <h3 className="text-sm font-bold leading-5 text-slate-950">
                  {benefit.title}
                </h3>
                <p className="mt-1 text-xs leading-5 text-slate-600 sm:text-sm">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>

          {/* <div className="mt-5 hidden lg:block">
            <StudentIllustration />
          </div> */}
        </div>

        <div className="min-w-0">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold tracking-[0.14em] text-blue-600 sm:text-sm">
                FROM THE QUESTION BANK
              </p>
              <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
                TODAY'S CHALLENGE
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Review a published question with its answer key and explanation.
              </p>
            </div>

            <div className="hidden shrink-0 rounded-2xl border border-slate-200 bg-white/90 px-3 py-3 shadow-sm sm:block">
              <p className="text-xs font-semibold text-slate-800">
                <span className="mr-2 text-blue-600">▦</span>
                {new Date().toLocaleDateString('en-IN', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                Keep your curiosity alive.
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_12px_36px_rgba(15,23,42,0.05)] sm:p-6">
            <HighlightQuestion />
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 px-1 text-xs text-slate-500">
            <span>One question. One new idea.</span>
            <button
              type="button"
              onClick={() => navigate('/questions')}
              className="font-semibold text-slate-800 transition hover:text-blue-600"
            >
              Explore the Question Bank →
            </button>
          </div>
        </div>

        {/* <div className="lg:hidden">
          <StudentIllustration />
        </div> */}
      </Container>
    </section>
  )
}
