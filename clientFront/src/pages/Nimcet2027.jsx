import { Link } from 'react-router-dom'
import { admissionsSite, ExamGuide, guideLink, GuideSection, syllabus2026 } from '../components/ExamGuide'

export default function Nimcet2027() {
  return (
    <ExamGuide title="NIMCET 2027 exam updates and preparation"
      summary="NIMCET is the NIT MCA Common Entrance Test for admission to MCA programmes at participating institutes. Check where the 2027 dates and eligibility will be published and start preparing while you wait.">
      <GuideSection title="Where to check the 2027 exam date and application">
        <p>
          At the last check on <time dateTime="2026-11-28">28 November 2026</time>, the official portal still showed the 2026 session.
          Check the <a className={guideLink} href={`${admissionsSite}/`}>official NIMCET admissions portal</a> for the 2027 notification,
          registration window, exam date and eligibility requirements.
        </p>
      </GuideSection>
      <GuideSection title="Syllabus topics to start practising">
        <p>
          Use the <a className={guideLink} href={syllabus2026}>official 2026 syllabus</a> as a starting point.
          Compare it with the 2027 brochure when it is published.
        </p>
        <ul className="list-disc space-y-1 pl-6">
          <li><strong>Mathematics</strong> covers areas such as algebra, calculus, probability and coordinate geometry.</li>
          <li><strong>Analytical ability and logical reasoning</strong> includes patterns, deductions and problems based on given information.</li>
          <li><strong>Computer awareness</strong> includes computer fundamentals and data representation.</li>
          <li><strong>General English</strong> covers reading comprehension, grammar and vocabulary.</li>
        </ul>
      </GuideSection>
      <GuideSection title="Build a practice routine">
        <ol className="list-decimal space-y-2 pl-6">
          <li>Try a set from the <Link className={guideLink} to="/questions">NIMCET question bank</Link> and write down the topics behind your mistakes.</li>
          <li>Revisit one weak topic at a time. Solve a similar question before reading the worked solution.</li>
          <li>Attempt <Link className={guideLink} to="/pyq">previous-year NIMCET questions</Link>, then try a <Link className={guideLink} to="/tests">timed mock test</Link> to practise pacing.</li>
        </ol>
        <p>See the <Link className={guideLink} to="/nimcet-2026">NIMCET 2026 archive</Link> for the previous session’s eligibility rules and section timings.</p>
      </GuideSection>
    </ExamGuide>
  )
}
