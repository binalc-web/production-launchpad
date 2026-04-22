import { Box, List, Typography, Link as MuiLink } from '@mui/material';
import PrivacyPolicyAndTermOfUseHeaderCard from '../components/PrivacyPolicyAndTermOfUseHeaderCard';
import PrivacyPolicyAndTermOfUseTile from '../components/PrivacyPolicyAndTermOfUseTile';
import PrivacyPolicyListTile from '../components/PrivacyPolicyListTile';
import { useEffect } from 'react';
import { trackEvent } from '@/utils/mixPanel/mixpanel';

export const PrivacyPolicy: React.FC = () => {
  useEffect(() => {
    // Track the event when the component mounts
    void trackEvent('Privacy Policy Page Loaded');
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
          Our Privacy Policy
        </Typography>
        <Typography
          fontWeight={400}
          fontSize={14}
          color="natural.400"
          textAlign="center"
        >
          Read our Privacy Policy below to learn more about your rights and
          responsibilities as a Solverein, Inc. user.
        </Typography>
        <Typography
          mt={4.4}
          fontWeight={600}
          fontSize={14}
          color="natural.500"
          textAlign="justify"
        >
          Updated: April 18, 2025
        </Typography>
        <PrivacyPolicyAndTermOfUseTile
          title=""
          description="Solverein, Inc. (“We,” “Us,” or the “Company”) is strongly committed to protecting the privacy of your personal information. This privacy policy explains the Company’s data collection and use practices with respect to its website at solverein.io (the “Site”) as well as its Platform (Site and Platform shall collectively be referred to as the “Services”). Except as specifically provided below, this Privacy Policy references other information collected by Company by or through any other means, such as information collected offline. By using the Services, you agree to the information collection and use practices described in this Privacy Policy. If you do not agree to the terms set forth herein, do not use the Services"
        />

        <PrivacyPolicyAndTermOfUseTile
          title="Collection of Personal Information"
          description="When you register for and access the Services, we may ask you for information that personally identifies you or provides information about yourself (“personal information” or “Individually Identifiable Information”) or allows us to contact you to provide a service or a product or carry out a transaction that you have requested (such as requesting information about the Company). The personal information we collect may include your name, your address, your telephone number, your email address and other contact information, and other information about services requested through the Services. You are not required to provide the personal information that we have requested, but, if you choose not to do so, in many cases we will not be able to provide you with the Services you have requested or respond to questions you may have."
        >
          <Typography
            mt={1.6}
            fontSize={14}
            color="natural.500"
            textAlign="justify"
          >
            We may also collect information about your visit to the Site, such
            as the name of the Internet service provider and the Internet
            Protocol (IP) address through which you access the Internet; the
            date and time you access the Site; the pages that you access while
            at the Site and the Internet address of the website from which you
            linked directly to the Site. This information is used, among other
            reasons, to help improve the Site, analyze use trends, and
            administer the Site.
          </Typography>
          <Typography
            mt={1.6}
            fontSize={14}
            color="natural.500"
            textAlign="justify"
          >
            We only have access to and collect personal information that you
            voluntarily give us by filling out our online forms and surveys
            which are part of the Platform which may grant us access to your
            health records.
          </Typography>
        </PrivacyPolicyAndTermOfUseTile>

        <PrivacyPolicyAndTermOfUseTile
          title="Use of Personal Information"
          description="We may access, exchange, use, and/or disclose your Individually Identifiable Information as necessary to provide our services, comply with legal obligations, or fulfill contractual requirements, and such information may also be accessed, exchanged, used, or disclosed by trusted third-party service providers, business partners, or governmental entities to whom we provide access, in each case consistent with this Privacy and Security Notice and applicable law. Except as otherwise required by law, the personal information collected during the performance of Services will be used solely to: "
        >
          <List sx={{ listStyleType: 'disc', pl: 3 }}>
            <PrivacyPolicyListTile
              text="Operate the Site and to provide the Service(s) and/or product(s) or carry out the transaction(s)
you have requested or authorized"
            />
            <PrivacyPolicyListTile text="To provide you with more effective customer service" />
            <PrivacyPolicyListTile text="To improve the Site, Services and any related Company products or services" />
            <PrivacyPolicyListTile text="To make the Site easier to use by eliminating the need for your repeated entry of the same information. In order to offer you a more consistent experience in your interactions with the Company, information collected by the Site may be combined with information collected in connection with other Company products and services" />
            <PrivacyPolicyListTile text="From our Site, you may use third party social media widgets/tools/buttons. If you use that functionality, your use is subject to the third party’s privacy policy and terms. As with all links to non-Company websites/content/services, we recommend that you read the privacy policies and terms associated with third party properties carefully." />
          </List>
        </PrivacyPolicyAndTermOfUseTile>

        <PrivacyPolicyAndTermOfUseTile
          title="Health Information"
          description="In certain situations, we may be considered a Business Associate as defined by HIPAA (the federal Health Insurance Portability and Accountability Act) of certain Covered Entities (as also defined in HIPAA), and as such we may have specific federal, state, and contractual restrictions on how we can use your Protected Health Information (“PHI”). When acting as a Business Associate, we will only use or disclose your PHI or Personal Information as required by law or as permitted by the Business Associate Agreement (“BAA”) that we have in place with a specific Covered Entity, and we will comply with the HIPAA Rules for the PHI handled under that agreement."
        >
          <Typography
            mt={1.6}
            fontSize={14}
            color="natural.500"
            textAlign="justify"
          >
            When we request, receive, or transmit your health records directly
            at your direction and on your behalf as an individual—and not on
            behalf of a Covered Entity—we are not acting as a HIPAA Covered
            Entity or Business Associate for those activities, and HIPAA does
            not apply to our handling of such information. In those cases, your
            information is instead subject to this Privacy and Security Notice,
            the Federal Trade Commission Act, the FTC Health Breach Notification
            Rule, and applicable state privacy and consumer protection laws.
          </Typography>

          <Typography
            mt={1.6}
            fontSize={14}
            color="natural.500"
            textAlign="justify"
          >
            Please be aware that when you give other individuals access to your
            PHI or Personal Information, they may be able to use, reproduce,
            distribute, display, transmit, and/or communicate the data to others
            and the public. We shall not have any responsibility for access,
            use, or disclosure of your PHI or Personal Information by people you
            authorized to have access to your user account.
          </Typography>
        </PrivacyPolicyAndTermOfUseTile>
        <PrivacyPolicyAndTermOfUseTile
          title="How We Share Information"
          description="Except as expressly provided herein, unless you ask or provide your consent to do so, we will not share
your personal information with any third party outside of our organization."
        >
          <Typography
            mt={1.6}
            fontSize={14}
            color="natural.500"
            textAlign="justify"
          >
            The Company may occasionally hire other companies to provide limited
            services on our behalf, such as website hosting, website design or
            technical support, mailing/shipping, answering customer questions
            about Services, and sending information about special offers and
            services. We will only provide those companies with the minimum
            necessary personal information they need to deliver the service.
            They are required to maintain the confidentiality of the information
            and are prohibited from using that information for any other
            purpose. For example, the Company may share data:
          </Typography>

          <List sx={{ listStyleType: 'disc', pl: 3 }}>
            <PrivacyPolicyListTile text="To enable third parties to provide services to us." />
            <PrivacyPolicyListTile text="To comply with our legal obligations, regulations or contracts, or to respond to a court order, administrative or judicial process, such as a subpoena, government audit or search warrant. Categories of recipients would include counterparties to contracts, judicial and governmental bodies. To comply with these obligations, we may be required to disclose individually identifiable information relating to reproductive health care services or gender affirming care. Written or electronic notice will be provided to you if we need to disclose your information for this purpose, within three (3) business days of our receipt of such a subpoena, audit, court order, or search warrant, unless such notice is prohibited by law." />
            <PrivacyPolicyListTile text="In response to lawful requests by public authorities (such as national security or law enforcement). Written or electronic notice will be provided to you within three (3) business days of our making your personal information available in accordance with such lawful request." />

            <PrivacyPolicyListTile
              text="To seek legal advice from external lawyers and advice from other professional advisers such as
accountants, management consultants, etc."
            />
            <PrivacyPolicyListTile text="As necessary to establish, exercise or defend against potential, threatened or actual litigation (such as adverse parties in litigation)" />
            <PrivacyPolicyListTile text="Where necessary to protect Company, your vital interests, such as safety and security, or those of another person" />
            <PrivacyPolicyListTile text="In connection with the sale, assignment or other transfer of all or part of our business (such as a potential purchaser and its legal/professional advisers) " />
          </List>

          <Typography
            mt={1.6}
            fontSize={14}
            color="natural.500"
            textAlign="justify"
          >
            We may aggregate and/or de-identify data about visitors to our Site
            or other collection activities and use it for any purpose, including
            product and service development and improvement activities.
          </Typography>
        </PrivacyPolicyAndTermOfUseTile>
        <PrivacyPolicyAndTermOfUseTile
          title="Control of Personal Information"
          description="Except as otherwise described in this Privacy Policy, your personal information will not be shared outside of the Company without your permission. We will not access, exchange, use, or disclose your personal information to assert any type of claim against you except for the collection of fees."
        >
          <Typography
            mt={1.6}
            fontSize={14}
            color="natural.500"
            textAlign="justify"
          >
            For persons over the age of 13, providing information about yourself
            through the Site is free and completely voluntary. No information
            should be submitted to or posted to the Site by any person under the
            age of 13 years. The Company does not knowingly collect information
            from children under 13. If you are under 13 years old, you may not
            attempt to provide your information through the Site. If the Company
            determines that contact information has been submitted by a person
            under age 13, such information will be removed. If you are between
            the ages of 13 and 17, you may use the Site only with your parent or
            guardian’s consent; the Company reserves the right to request
            verification of such parent or guardian’s consent. Personal
            information of persons between ages 13 and 17 will be collected as
            described in this Privacy Policy. By submitting your contact
            information through the Site, you represent that you are age 13 or
            over.
          </Typography>
        </PrivacyPolicyAndTermOfUseTile>

        <PrivacyPolicyAndTermOfUseTile
          title="Retention"
          description="We will only retain your personal data for as long as necessary to fulfill the purposes for which it was collected, including for the purposes of satisfying legal, accounting, or reporting requirements. We are a United States-based company, and as such you expressly consent to the transfer and storage of your personal data collected through the website to anywhere in the United States where we maintain facilities. In some circumstances we may anonymize your personal data (so that it can no longer be associated with you) in which case we may use this information indefinitely without further notice to you."
        />

        <PrivacyPolicyAndTermOfUseTile
          title="Security of Personal Information"
          description="The Company is strongly committed to protecting the security of your personal information. When you submit personal information on the Site, the Company will take all reasonable efforts in order to protect your personal information. The Company uses commercially reasonable efforts to protect Individually Identifiable Information from unauthorized or illegal access, modification, use, destruction, or disclosure once it is received. These measures include the implementation and maintenance of administrative and technical safeguards consistent with applicable industry standards, regulatory requirements, and recognized security frameworks. As part of these efforts, the Company encrypts all Individually Identifiable Information held by the Company, both in transit and at rest, regardless of whether such data are TEFCA Information. Encryption is implemented using industry-standard algorithms and secure protocols. Access to Individually Identifiable Information is restricted to authorized personnel who require such access to perform their job duties. Company ensures that its security measures are regularly reviewed, tested, and updated to address emerging threats, maintain compliance with applicable laws, and satisfy contractual and certification requirements. Although we implement reasonable administrative, physical, and electronic security measures designed to protect your personal data from unauthorized access, we cannot ensure the security of any information you transmit to or guarantee that this information will not be accessed, disclosed, altered, or destroyed. We will make any legally required disclosures of any breach of the security, confidentiality, or integrity of your unencrypted electronically stored personal data."
        />
        <PrivacyPolicyAndTermOfUseTile
          title="Cookies"
          description="Upon your acceptance of cookies from our websites, we may collect information about your visits to the
Site without you actively re-submitting acceptance of cookies. In some countries, we are not permitted
to send cookies to the browser of a user without the prior consent of the affected user. In this case, we
will seek such consent. The remainder of this section assumes that either the use of cookies is not
restricted by applicable law or if it is restricted the individual has explicitly consented to the use of cookies. A cookie is a small text file that is placed on your hard disk by a web page server and that helps
the Site to recall your specific information on subsequent visits. The use of cookies simplifies the process
of delivering relevant content, eases Site navigation, and provides other similar benefits to users of the
Site. When you return to the Site, the information you previously provided can be retrieved, so you can
easily use the Site’s features."
        >
          <Typography
            mt={1.6}
            fontSize={14}
            color="natural.500"
            textAlign="justify"
          >
            You have the ability to accept or decline the use of cookies. Most
            web browsers automatically accept cookies, but you can usually
            modify your browser setting to decline cookies if you prefer. If you
            choose to decline cookies, you may not be able to fully experience
            the features of the Site.
          </Typography>
        </PrivacyPolicyAndTermOfUseTile>
        <PrivacyPolicyAndTermOfUseTile
          title="Your Rights"
          description="You may request that we take the following actions in relation to your personal data. We reserve the right to charge you a fee to comply with these requests, but such fee shall only be for the reasonable and actual costs Company incurs in carrying out the request"
        >
          <List sx={{ listStyleType: 'disc', pl: 3 }}>
            <PrivacyPolicyListTile text="Access. Provide you with information about our processing of your personal data and give you access to your personal data " />
            <PrivacyPolicyListTile text="Correct. Update or correct inaccuracies in your personal data" />
            <PrivacyPolicyListTile text="Delete. Delete your personal data" />
            <PrivacyPolicyListTile text="Transfer. Transfer a machine-readable copy of your personal data to you or a third party of your choice  " />
            <PrivacyPolicyListTile text="Restrict. Restrict the processing of your personal data " />
            <PrivacyPolicyListTile text="Data portability. You have the right to request the receipt or the transfer to another organization, in a machine-readable form, of your personal data " />
            <PrivacyPolicyListTile text="Object. Object to our legitimate interests as the basis of our processing of your personal data" />
            <PrivacyPolicyListTile text="Right to withdraw consent. When you have given your explicit consent for the processing of your data, you can withdraw it at any time without justification " />
            <PrivacyPolicyListTile text="You also have the right to lodge a complaint with your local Data Protection Authority or with the Data Protection Authority where the alleged infringement took place." />
          </List>
          <Typography
            mt={1.6}
            fontSize={14}
            color="natural.500"
            textAlign="justify"
          >
            If you wish to exercise any rights described in this section, you
            may contact our data protection privacy team at info@solverein.io or
            using the contract information provided below.
          </Typography>
        </PrivacyPolicyAndTermOfUseTile>

        <PrivacyPolicyAndTermOfUseTile
          title="EU, EEA, UK Residents"
          description={`If you reside in the United Kingdom, EEA, or Switzerland and would like to submit a complaint about our use of your personal data or response to your requests regarding your personal data or you wish to exercise any rights described in the "Your Rights" section, you may contact our data protection privacy team at info@solverein.io or using the contract information provided below.`}
        />
        <PrivacyPolicyAndTermOfUseTile
          title="Choice/Opt Out"
          description="The Site provides you with the opportunity to choose to receive updates about the Company and any information we may want you to know about. You may be added to the Company’s mailing lists and signed up for certain notifications from the Company when you submit your contact information through the Site. If you would like to be removed from this list and/or opt out of these notifications, please unsubscribe using the instructions in the email or call or write us at the physical address, email address or telephone number listed below. Please allow five (5) business days for processing of your opt-out request."
        >
          <Typography
            mt={1.6}
            fontSize={14}
            color="natural.500"
            textAlign="justify"
          >
            If you need to correct or update your contact information, or you no
            longer desire our services, you can do so by contacting us using the
            contact information set forth below.
          </Typography>
        </PrivacyPolicyAndTermOfUseTile>

        <PrivacyPolicyAndTermOfUseTile
          title="Email, Text, Telephone Communications"
          description="You can unsubscribe from email, text and phone communications at any time. To stop receiving our promotional emails, follow the unsubscribe instructions in the email messages you receive from us or contact us as described in the “Contacting Us” Section below. To opt-out of receiving text messages, follow the opt-out instructions in the text messages that you receive from us. We will process your request within a reasonable time after receipt, in accordance with applicable laws. Note that you will continue to receive transaction-related emails regarding products or services you have requested. We may also send you certain non-promotional communications regarding the Company and, to the extent permitted by law, you will not be able to opt-out of those communications (e.g., communications regarding updates to this Privacy Policy)."
        />

        <PrivacyPolicyAndTermOfUseTile
          title="Third Party Sites"
          description="The Services may contain links to other sites that are not affiliated with the Company. Any such link is not, and is not intended to be, an endorsement of such other website or its content and you should review the terms of use and privacy policy of such other website. These websites operate independently of the Company and the Company is not responsible for the privacy practices or the content of such websites."
        />

        <PrivacyPolicyAndTermOfUseTile
          title="TEFCA Compliance"
          description="We may act as a TEFCA (Trusted Exchange Framework and Common Agreement) Participant as an IAS (Individual Access Service) Provider. In accordance, we will comply with all IAS Provider Requirements, as listed in the Terms of Participation and the Standard Operating Procedure (SOP) IAS Provider Requirements. For the avoidance of doubt, we ourselves are not a QHIN (Qualified Health Information Network), but we may work with and send information through a QHIN."
        >
          <Typography
            mt={1.6}
            fontSize={14}
            color="natural.500"
            textAlign="justify"
          >
            All disclosures through TEFCA are in accordance with the permitted
            and requires uses and disclosures specified in the Common Agreement
            and applicable U.S. Department of Health and Human Services
            guidance. You have the right to opt-out of having your personal
            information disclosed via TEFCA Exchange by contacting us according
            to the Contact Information section below. Our obligations as an IAS
            Provider under this Privacy and Security Notice will continue for as
            long as we maintain your Individually Identifiable Information.
          </Typography>
        </PrivacyPolicyAndTermOfUseTile>

        <PrivacyPolicyAndTermOfUseTile
          title="Breach and IAS Incident Notification"
          description="If we reasonably believe that your Individually Identifiable Information has been affected by a TEFCA Security Incident or a Breach of Unencrypted Individually Identifiable Information (an “IAS Incident” or “Incident”), we will notify you without unreasonable delay and in no event later than as required by applicable law. Our notice to you will include, to the extent possible:"
        >
          <List sx={{ listStyleType: 'disc', pl: 3 }}>
            <PrivacyPolicyListTile text="A description of what happened, including the date of the Incident and the date we discovered it, if known." />
            <PrivacyPolicyListTile text="A description of the type(s) of information involved, such as your name, email address, phone number or other relevant data elements." />
            <PrivacyPolicyListTile text="Steps you should take to protect yourself from potential harm resulting from the Incident." />
            <PrivacyPolicyListTile text="A description of what we are doing to investigate the Incident, mitigate harm to you, and protect against future Incidents." />
            <PrivacyPolicyListTile text="Contact procedures for you to ask questions or obtain additional information, including a toll-free telephone number, an email address, and a website or contact form." />
          </List>
          <Typography
            mt={1.6}
            fontSize={14}
            color="natural.500"
            textAlign="justify"
          >
            We will provide this notice in electronic form, unless prohibited by
            applicable law, and in accordance with your communication
            preferences on record.
          </Typography>
        </PrivacyPolicyAndTermOfUseTile>

        <PrivacyPolicyAndTermOfUseTile
          title="Changes to this Privacy Policy"
          description="We reserve the right to update this Privacy Policy from time to time and without notice to you. All such
updates shall be effective immediately unless otherwise stated. We encourage you to periodically
review this Privacy Policy to stay informed about how we are helping to protect the personal
information we collect. Your continued use of the Site constitutes your agreement to this Privacy Policy,
as amended from time to time."
        />
        <PrivacyPolicyAndTermOfUseTile
          title="Coordination with Terms of Use"
          description="This Privacy Policy is intended solely to clarify the Company’s practices with respect to personal
information and shall not in any way modify or limit the legal effect of the Terms of Service of the Site.
In the event of any conflict between this Privacy Policy and the Terms of Service, the Terms of Service
shall control. In particular, the Company will not be liable for any damages or injury (including, without
limitation, incidental and consequential damages, personal injury/wrongful death, lost profits, or
damages resulting from lost data or business interruption) that result from your use of the Site or your
submission of personal information through the Site, even if there is negligence on the part of the
Company or its employees. In addition, you agree to defend, indemnify, and hold the Company, its
officers, directors, employees, agents, licensors, and suppliers, harmless from and against any claims,
actions or demands, liabilities and settlements including without limitation, reasonable attorneys’ fees,
resulting from, or alleged to result from, your submission of personal information to the Site or your
unlawful collection of personal information of others through use of the Site."
        />
        <PrivacyPolicyAndTermOfUseTile
          title="Governing Law"
          description="This Privacy Policy shall be governed by and interpreted in accordance with the laws of the State of Delaware. "
        />
        <PrivacyPolicyAndTermOfUseTile
          title="Revocation of Consent"
          description={`You may revoke your consent to this Privacy and Security Notice at any time. Revocation will prevent further access to our Individual Access Services (IAS) but will not affect actions taken before the date of revocation. You may revoke consent by sending an email to customercare@solverein.io with the subject line “Revoke Consent,” use the Contact Us Button and fill out the form at www.solverein.io or call us at 1-843-593-8138.
`}
        />
        <PrivacyPolicyAndTermOfUseTile
          title="Contact Information"
          description="The Company welcomes your comments regarding this Privacy Policy. If you have questions about this Privacy Policy, please contact us electronically or via postal mail at the following address, and we will use commercially reasonable efforts to promptly determine and remedy the problem, or if you need to contact us for any other reason, you may do so using the following information:"
        >
          <Typography
            mt={1.6}
            fontSize={14}
            color="natural.500"
            textAlign="justify"
          >
            Solverein, Inc.
          </Typography>
          <Typography
            mt={1.6}
            fontSize={14}
            color="natural.500"
            textAlign="justify"
          >
            Email:{' '}
            <MuiLink
              href="mailto: customercare@solverein.io"
              target="_blank"
              rel="noopener noreferrer"
            >
              customercare@solverein.io
            </MuiLink>
          </Typography>
          <Typography
            mt={1.6}
            fontSize={14}
            color="natural.500"
            textAlign="justify"
          >
            Telephone number:{' '}
            <MuiLink
              href="tel:1-843.593.8138"
              target="_blank"
              rel="noopener noreferrer"
            >
              1-843.593.8138
            </MuiLink>
          </Typography>
        </PrivacyPolicyAndTermOfUseTile>
      </Box>
    </>
  );
};
