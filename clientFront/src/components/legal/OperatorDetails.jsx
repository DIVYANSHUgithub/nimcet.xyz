import { legalDetails } from '../../lib/legal'
import LegalEmail from './LegalEmail'

export default function OperatorDetails() {
  return <address className="mt-3 not-italic">
    {legalDetails.operatorName}, individual operator of NIMCET.XYZ<br />
    {legalDetails.postalAddress}<br />
    <LegalEmail />
  </address>
}
