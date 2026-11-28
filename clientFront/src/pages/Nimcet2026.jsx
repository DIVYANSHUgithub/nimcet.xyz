import { Link } from 'react-router-dom'
import { admissionsSite, ExamGuide, guideLink, GuideSection, syllabus2026 } from '../components/ExamGuide'

const examSections = [
  ['Mathematics', 50, '+12', '−3', '70 min'],
  ['Analytical ability and logical reasoning', 40, '+6', '−1.5', '30 min'],
  ['Computer awareness', 20, '+6', '−1.5'],
  ['General English', 10, '+4', '−1'],
]

export default function Nimcet2026() {
  return (
    <ExamGuide title="NIMCET 2026 exam archive"
      summary="NIT Tiruchirappalli coordinated the NIMCET 2026 exam on 6 June 2026, from 2 to 4 p.m. IST. This archive summarizes the exam pattern and eligibility and links to the official admission resources.">
      <GuideSection title="Exam pattern and marking scheme">
        <p>The computer-based test had 120 multiple-choice questions worth 1,000 marks. Each part had a fixed timer. Unanswered questions earned zero marks.</p>
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
            <caption className="sr-only">NIMCET 2026 questions, marks and timings by subject</caption>
            <thead className="bg-canvas-muted text-ink-heading">
              <tr>{['Subject', 'Questions', 'Correct', 'Incorrect', 'Time'].map(label => <th key={label} scope="col" className="px-3 py-2">{label}</th>)}</tr>
            </thead>
            <tbody>
              {examSections.map(([subject, count, correct, incorrect, time], index) => (
                <tr key={subject} className="border-t border-line">
                  <th scope="row" className="px-3 py-2 font-medium">{subject}</th>
                  <td className="px-3 py-2">{count}</td>
                  <td className="px-3 py-2">{correct}</td>
                  <td className="px-3 py-2">{incorrect}</td>
                  {index < 2 && <td className="px-3 py-2">{time}</td>}
                  {index === 2 && <td className="px-3 py-2" rowSpan={2}>20 min combined</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GuideSection>
      <GuideSection title="2026 eligibility">
        <p>
          The 2026 brochure required Indian nationals to have a recognized B.E. or B.Tech., or an undergraduate programme
          of at least three years with Mathematics or Statistics as a subject. The minimum was 60% overall or 6.5 CGPA
          on a 10-point scale. For SC, ST and PwD candidates it was 55% or 6.0 CGPA.
        </p>
      </GuideSection>
      <GuideSection title="Official 2026 documents">
        <ul className="list-disc space-y-2 pl-6">
          <li><a className={guideLink} href={`${admissionsSite}/document-category/information-brochure-2/`}>Information brochure and counselling documents</a></li>
          <li><a className={guideLink} href={syllabus2026}>NIMCET 2026 syllabus</a></li>
          <li><a className={guideLink} href={`${admissionsSite}/schedule/`}>Official exam and counselling schedule</a></li>
        </ul>
        <p>Preparing for the next session? Start with the <Link className={guideLink} to="/nimcet-2027">NIMCET 2027 preparation guide</Link> or browse <Link className={guideLink} to="/pyq">published previous-year questions</Link>.</p>
      </GuideSection>
    </ExamGuide>
  )
}
