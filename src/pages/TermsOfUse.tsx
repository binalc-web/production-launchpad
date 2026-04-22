import { Box, Typography, Link as MuiLink } from '@mui/material';
import PrivacyPolicyAndTermOfUseTile from '../components/PrivacyPolicyAndTermOfUseTile';

import { Link as RouterLink } from '@tanstack/react-router';
import PrivacyPolicyAndTermOfUseHeaderCard from '../components/PrivacyPolicyAndTermOfUseHeaderCard';
import { useEffect } from 'react';
import { trackEvent } from '@/utils/mixPanel/mixpanel';

export const TermsOfUse: React.FC = () => {
  useEffect(() => {
    // Track the event when the component mounts
    void trackEvent('Terms of Use Page Loaded');
  }, []);

  return (
    <>
      <PrivacyPolicyAndTermOfUseHeaderCard />

      <Box display="flex" flexDirection="column" mt={2} mx={30}>
        <Typography
          fontWeight={700}
          fontSize={36}
          color="natural.700"
          textAlign="center"
        >
          Our Terms of Service
        </Typography>
        <Typography
          fontWeight={400}
          fontSize={14}
          color="natural.400"
          textAlign="center"
        >
          Read our Terms below to learn more about your rights and
          responsibilities as a Solverein, Inc. user.
        </Typography>

        <PrivacyPolicyAndTermOfUseTile
          mt={4.4}
          title="Acceptance of Terms"
          description="The following terms and conditions govern use of the website solverien.io and medicalease.io(the “Site”). The Site is offered subject to acceptance without modification of any of the terms and conditions contained herein or all other guidelines or policies that may be published from time to time on this Site by Solverein, Inc. (collectively, the “Terms of Use”). IF YOU DO NOT AGREE TO ALL OF THESE TERMS OF USE, THEN DO NOT ACCESS OR USE THE SITE. BY VIEWING THE SITE, YOU AGREE TO BE BOUND BY ALL OF THESE TERMS OF USE."
        />

        <PrivacyPolicyAndTermOfUseTile
          title="Changes"
          description=" Solverein, Inc. (“Solverein”, “We”, “Us” or the “Company”) reserves
          the right, at its sole discretion, to modify or replace any of these
          Terms of Use at any time. It is your responsibility to check the Terms
          of Use periodically for changes. We will post the date of the most
          recent updates at the top of these Terms. Your continued use of the
          Site following the posting of any changes to the Terms of Use
          constitutes acceptance of those changes."
        />

        <PrivacyPolicyAndTermOfUseTile
          title="Information and Privacy"
          description=""
        >
          <Typography
            mt={1.6}
            fontSize={14}
            color="natural.500"
            textAlign="justify"
          >
            At your election, you may request (and Solverein may provide)
            additional information about Solverein. When you do so, you may need
            to submit certain information or data to Solverein, for example,
            your contact information. Solverein’s current privacy policy is
            available at{' '}
            <MuiLink
              component={RouterLink}
              to="/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
            >
              the Privacy Policy
            </MuiLink>
            , which is incorporated by this reference. Solverein will not edit,
            delete or disclose the contents of your data in connection with the
            Site unless (1) reasonably necessary to perform the request, (2)
            authorized by you, (3) otherwise permitted under the Privacy Policy,
            or (4) Solverein is required to do so by law or regulation, or in
            good faith believes that such action is necessary to (i) conform or
            comply with applicable laws, regulations or legal process, (ii)
            protect or defend the rights or property of Solverein or any other
            user or (iii) enforce these Terms of Use. Solverein may terminate
            your access to all or any part of the Site at any time, with or
            without cause, with or without notice, effective immediately.
          </Typography>
        </PrivacyPolicyAndTermOfUseTile>

        <PrivacyPolicyAndTermOfUseTile
          title="Rules and Conduct"
          description="As a condition of use, you promise not to use the Site for any purpose
          that is unlawful or prohibited by these Terms of Use, or any other
          purpose not reasonably intended by Solverein. You agree to abide by
          all applicable local, state, national and international laws and
          regulations."
        />

        <PrivacyPolicyAndTermOfUseTile
          title="Use of Site"
          description="The Site and services contained in each Site are provided to you for your personal, noncommercial use. Solverein
reserves the right, at any time, to modify, suspend, or discontinue the services (in whole or in part) with or without
notice to you. You agree that Solverein will not be liable to you or to any third party for any modification, suspension,
or discontinuation of the service or any part thereof. The Site may contain forward-looking statements and information
relating to Solverein and its products and services that are based on its beliefs as well as assumptions made by and
information currently available to it. The words “anticipate,” “believe,” “estimate,” “expect,” “intend,” “will,” and
similar expressions, as they relate to Solverein, are intended to identify forward-looking statements. Actual results could
differ materially from those projected in such forward-looking statements. Solverein does not intend to update these
forward-looking statements."
        />

        <PrivacyPolicyAndTermOfUseTile
          title="Third-party Sites"
          description="The Site may permit you to link to other websites on the Internet, and other websites may contain links to the Site.
These other websites are not under Solverein’s control, and you acknowledge that Solverein is not responsible for the
accuracy, legality, appropriateness or any other aspect of the content or function of such websites. The inclusion of any
such link does not imply endorsement by Solverein or any association with its operators."
        />

        <PrivacyPolicyAndTermOfUseTile
          title="Proprietary Rights"
          description="You agree that all content and materials delivered via the Site or otherwise made available by Solverein on or through
the Site are protected by copyrights, trademarks, service marks, patents, trade secrets or other proprietary rights and
laws. Except as expressly authorized by Solverein in writing, you agree not to sell, license, rent, modify, distribute,
copy, reproduce, transmit, publicly display, publicly perform, publish, adapt, edit or create derivative works from such
materials or content. However, you may print or download a reasonable number of copies of the materials or content at
this Site for your internal noncommercial purposes, provided that you retain all copyright and other proprietary notices
contained therein. In the event that you are able to provide Solverein with any content or information, you expressly
agree that you have the expressed right and ability to provide Solverein with any content or user provider input. You
represent and warrant that no third-party copyrighted information or content will be provided to Solverein without
Solverein’s expressed written consent."
        />

        <PrivacyPolicyAndTermOfUseTile
          title="No Warranties"
          description="THE SITE AND ALL MATERIALS, INFORMATION, SOFTWARE, PRODUCTS AND SITES INCLUDED IN OR
AVAILABLE THROUGH THE SITE (THE CONTENT) ARE PROVIDED “AS IS” AND “AS AVAILABLE.” THE SITE, SERVICE AND CONTENT ARE PROVIDED WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF TITLE, NON-INFRINGEMENT, MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE, AND ANY
WARRANTIES IMPLIED BY ANY COURSE OF PERFORMANCE OR USAGE OF TRADE, ALL OF WHICH
ARE EXPRESSLY DISCLAIMED. SOLVEREIN AND ITS AFFILIATES, LICENSORS AND SUPPLIERS DO NOT
WARRANT THAT: (1) THE CONTENT IS TIMELY, ACCURATE, COMPLETE, RELIABLE OR CORRECT; (2)
THE SITE WILL BE SECURE OR AVAILABLE AT ANY PARTICULAR TIME OR LOCATION; (3) ANY
DEFECTS OR ERRORS WILL BE CORRECTED; (4) THE CONTENT IS FREE OF VIRUSES OR OTHER
HARMFUL COMPONENTS; OR (5) THE RESULTS OF USING THE SITE OR SERVICE WILL MEET YOUR
REQUIREMENTS. YOUR USE OF THE SITE AND/OR SERVICE ARE SOLELY AT YOUR OWN RISK."
        />

        <PrivacyPolicyAndTermOfUseTile
          title="Limitation of Liability"
          description="IN NO EVENT SHALL SOLVEREIN (OR ITS AFFILIATES, LICENSORS AND SUPPLIERS) BE LIABLE
CONCERNING THE SUBJECT MATTER OF THESE TERMS OF USE, REGARDLESS OF THE FORM OF ANY
CLAIM OR ACTION (WHETHER IN CONTRACT, NEGLIGENCE, STRICT LIABILITY OR OTHERWISE), FOR
ANY (1) MATTER BEYOND ITS REASONABLE CONTROL, (2) LOSS OR INACCURACY OF DATA, LOSS OR
INTERRUPTION OF USE, OR COST OF PROCURING SUBSTITUTE TECHNOLOGY, GOODS OR SITES, OR
(3) DIRECT OR INDIRECT, PUNITIVE, INCIDENTAL, RELIANCE, SPECIAL, EXEMPLARY OR
CONSEQUENTIAL DAMAGES INCLUDING, BUT NOT LIMITED TO, LOSS OF BUSINESS, REVENUES,
PROFITS OR GOODWILL, EVEN IF SOLVEREIN HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH
DAMAGES. THESE LIMITATIONS ARE INDEPENDENT FROM ALL OTHER PROVISIONS OF THIS
AGREEMENT AND SHALL APPLY NOTWITHSTANDING THE FAILURE OF ANY REMEDY PROVIDED
HEREIN."
        />

        <PrivacyPolicyAndTermOfUseTile
          title="Governing Law; Arbitration Agreement"
          description="These Terms of Use are governed by Delaware law."
        >
          <Typography
            mt={1.6}
            fontSize={14}
            fontWeight={600}
            color="natural.400"
            textAlign="justify"
          >
            Arbitration. Please read this Arbitration Agreement carefully. It is
            part of your contract with Solverein and affects your rights. It
            contains procedures for MANDATORY BINDING ARBITRATION AND A CLASS
            ACTION WAIVER.
          </Typography>
          <Typography
            mt={1.6}
            fontSize={14}
            color="natural.500"
            textAlign="justify"
          >
            Applicability of Arbitration Agreement. All claims and disputes
            (excluding claims for injunctive or other equitable relief as set
            forth below) in connection with the Terms or the use of any product
            or service provided by Solverein that cannot be resolved informally
            or in small claims court shall be resolved by binding arbitration on
            an individual basis under the terms of this Arbitration Agreement.
            Unless otherwise agreed to, all arbitration proceedings shall be
            held in English. This Arbitration Agreement applies to you and
            Solverein, and to any subsidiaries, affiliates, agents, employees,
            predecessors in interest, successors, and assigns, as well as all
            authorized or unauthorized users or beneficiaries of services or
            goods provided under the Terms.
          </Typography>

          <Typography
            mt={1.6}
            fontSize={14}
            color="natural.500"
            textAlign="justify"
          >
            Notice Requirement and Informal Dispute Resolution. Before either
            party may seek arbitration, the party must first send to the other
            party a written Notice of Dispute (“Notice”) describing the nature
            and basis of the claim or dispute, and the requested relief. A
            Notice to Solverein should be sent to: Solverein Inc., at 997
            Morrison Drive, Ste 200 Charleston, SC 29403, United States. After
            the Notice is received, you and Solverein may attempt to resolve the
            claim or dispute informally. If you and Solverein do not resolve the
            claim or dispute within 30 days after the Notice is received, either
            party may begin an arbitration proceeding. The amount of any
            settlement offers made by any party may not be disclosed to the
            arbitrator until after the arbitrator has determined the amount of
            the award, if any, to which either party is entitled.
          </Typography>
          <Typography
            mt={1.6}
            fontSize={14}
            color="natural.500"
            textAlign="justify"
          >
            Arbitration Rules. Arbitration shall be initiated through the
            American Arbitration Association (“AAA”), an established alternative
            dispute resolution provider (“ADR Provider”) that offers arbitration
            as set forth in this section. If AAA is not available to arbitrate
            or if the parties agree not to use AAA, the parties shall agree to
            select an alternative ADR Provider. The rules of the ADR Provider
            shall govern all aspects of the arbitration, including but not
            limited to the method of initiating and/or demanding arbitration,
            except to the extent such rules are in conflict with the Terms. The
            arbitration shall be conducted by a single, neutral arbitrator. Any
            judgment on the award rendered by the arbitrator may be entered in
            any court of competent jurisdiction. Each party shall bear its own
            costs (including attorney’s fees) and disbursements arising out of
            the arbitration and shall pay an equal share of the fees and costs
            of the ADR Provider.
          </Typography>
          <Typography
            mt={1.6}
            fontSize={14}
            color="natural.500"
            textAlign="justify"
          >
            Additional Rules for Non-Appearance-Based Arbitration. If
            non-appearance-based arbitration is elected, the arbitration shall
            be conducted by telephone, online and/or based solely on written
            submissions; the specific manner shall be chosen by the party
            initiating the arbitration. The arbitration shall not involve any
            personal appearance by the parties or witnesses unless otherwise
            agreed by the parties.
          </Typography>
          <Typography
            mt={1.6}
            fontSize={14}
            color="natural.500"
            textAlign="justify"
          >
            Time Limits. If you or Solverein pursue arbitration, the arbitration
            action must be initiated and/or demanded within the statute of
            limitations (i.e., the legal deadline for filing a claim) and within
            any deadline imposed under the AAA Rules for the pertinent claim.
          </Typography>

          <Typography
            mt={1.6}
            fontSize={14}
            color="natural.500"
            textAlign="justify"
          >
            Authority of Arbitrator. If arbitration is initiated, the arbitrator
            will decide the rights and liabilities, if any, of you and
            Solverein, and the dispute will not be consolidated with any other
            matters or joined with any other cases or parties. The arbitrator
            shall have the authority to grant motions dispositive of all or part
            of any claim. The arbitrator shall have the authority to award
            monetary damages, and to grant any non-monetary remedy or relief
            available to an individual under applicable law, the AAA Rules, and
            the Terms. The arbitrator shall issue a written award and statement
            of decision describing the essential findings and conclusions on
            which the award is based, including the calculation of any damages
            awarded. The arbitrator has the same authority to award relief on an
            individual basis that a judge in a court of law would have. The
            award of the arbitrator is final and binding upon you and Solverein.
          </Typography>
          <Typography
            mt={1.6}
            fontSize={14}
            color="natural.500"
            textAlign="justify"
          >
            Waiver of Jury Trial. THE PARTIES HEREBY WAIVE THEIR CONSTITUTIONAL
            AND STATUTORY RIGHTS TO GO TO COURT AND HAVE A TRIAL IN FRONT OF A
            JUDGE OR A JURY, instead electing that all claims and disputes shall
            be resolved by arbitration under this Arbitration Agreement.
            Arbitration procedures are typically more limited, more efficient
            and less costly than rules applicable in a court and are subject to
            very limited review by a court. In the event any litigation should
            arise between you and Solverein in any state or federal court in a
            suit to vacate or enforce an arbitration award or otherwise, YOU AND
            THE COMPANY WAIVE ALL RIGHTS TO A JURY TRIAL, instead electing that
            the dispute be resolved by a judge.
          </Typography>
          <Typography
            mt={1.6}
            fontSize={14}
            color="natural.500"
            textAlign="justify"
          >
            Waiver of Class or Consolidated Actions. ALL CLAIMS AND DISPUTES
            WITHIN THE SCOPE OF THIS ARBITRATION AGREEMENT MUST BE ARBITRATED OR
            LITIGATED ON AN INDIVIDUAL BASIS AND NOT ON A CLASS BASIS, AND
            CLAIMS OF MORE THAN ONE CUSTOMER OR USER CANNOT BE ARBITRATED OR
            LITIGATED JOINLY OR CONSOLIDATED WITH THOSE OF ANY OTHER CUSTOMER OR
            USER.
          </Typography>
          <Typography
            mt={1.6}
            fontSize={14}
            color="natural.500"
            textAlign="justify"
          >
            Confidentiality. All aspects of the arbitration proceeding,
            including but not limited to the award of the arbitrator and
            compliance therewith, shall be strictly confidential. The parties
            agree to maintain confidentiality unless otherwise required by law.
            This paragraph shall not prevent a party from submitting to a court
            of law any information necessary to enforce this Agreement, to
            enforce an arbitration award, or to seek injunctive or equitable
            relief.
          </Typography>
          <Typography
            mt={1.6}
            fontSize={14}
            color="natural.500"
            textAlign="justify"
          >
            Severability. If any part or parts of this Arbitration Agreement are
            found under the law to be invalid or unenforceable by a court of
            competent jurisdiction, then such specific part or parts shall be of
            no force and effect and shall be severed and the remainder of the
            Agreement shall continue in full force and effect.
          </Typography>
          <Typography
            mt={1.6}
            fontSize={14}
            color="natural.500"
            textAlign="justify"
          >
            Right to Waive. Any or all of the rights and limitations set forth
            in this Arbitration Agreement may be waived by the party against
            whom the claim is asserted. Such waiver shall not waive or affect
            any other portion of this Arbitration Agreement.
          </Typography>
          <Typography
            mt={1.6}
            fontSize={14}
            color="natural.500"
            textAlign="justify"
          >
            Survival of Agreement. This Arbitration Agreement will survive the
            termination of your relationship with Solverein.
          </Typography>
          <Typography
            mt={1.6}
            fontSize={14}
            color="natural.500"
            textAlign="justify"
          >
            Emergency Equitable Relief. Notwithstanding the foregoing, either
            party may seek emergency equitable relief before a state or federal
            court in order to maintain the status quo pending arbitration. A
            request for interim measures shall not be deemed a waiver of any
            other rights or obligations under this Arbitration Agreement.
            Nothing in this agreement limits either party’s ability to seek
            equitable relief.
          </Typography>
        </PrivacyPolicyAndTermOfUseTile>

        <PrivacyPolicyAndTermOfUseTile
          title="Miscellaneous"
          description="If any provision of the Terms of Use is found to be unenforceable or invalid, that provision will be limited or eliminated
to the minimum extent necessary so that the Terms of Use will otherwise remain in full force and effect and
enforceable. Solverein may assign, transfer or delegate any of its rights and obligations hereunder without consent. All
waivers and modifications must be in a writing signed by Solverein except as otherwise provided herein. No agency,
partnership, joint venture, or employment relationship is created as a result of these Terms of Use, and neither party has
any authority of any kind to bind the other in any respect."
        />
      </Box>
    </>
  );
};
