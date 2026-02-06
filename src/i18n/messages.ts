/** Use this file to specify the messaging used by your brand */

export const messages = {
  en: {
    portalName: `Data Submission Portal`,
    logo: `ieda_logo.png`, // Must be placed inside `/public/img/` directory
    portalNameShort: `DSP`,
    hubName: `IEDA`,
    home: {
      banner: {
        title: `Earth Science Data Submission Portal`,
        subtitle: ``,
        portalLinkHint: `Looking for CZNet data?`,
        portalLinkText: `Visit our data discovery portal`,
      },
      submitData: {
        title: `Submit Your Data and Research Products`,
        description: `The IEDA Earth Science Data Submission Portal provides tools
        for determining which repository to use for data submission along
        with enhanced submission tools to encourage data standards, complete
        metadata, and high-quality submissions.`,
        points: [
          {
            title: `Which repository?`,
            description: `Use the Portal's repository recommendation system to determine which repository is right for submitting your research products.

          `,
          },
          {
            title: `Which format?`,
            description: `Use community recommendations to decide on formats and conventions for your data files.`,
          },
          {
            title: `Which metadata?`,
            description: `Use the Portal's submission tools to ensure your metadata are complete and that your data are well described.`,
          },
        ],
      },
    },
    footer: {
      hubLink: `https://www.iedadata.org/`,
      orgName: `IEDA`,
      orgLink: `https://www.iedadata.org/`,
      repoUrl: `https://github.com/smrgeoinfo/IEDADataSubmission`,
      reportIssuesUrl: `https://github.com/smrgeoinfo/IEDADataSubmission/issues`,
    },
    about: {
      body: [
        `IEDA2 is a collaborative data infrastructure of three complementary
        data systems — EarthChem, LEPR/traceDs, and SESAR — that jointly
        support researchers in the Geosciences to share and access sample data
        following the FAIR data principles. The mission of IEDA2 is to ensure
        open, reproducible, and transparent science practices.`,
        `IEDA2 operates multiple specialized data systems including the
        EarthChem Library for archiving and publishing geoscience research data,
        PetDB for community-driven preservation and visualization of
        geochemical, geochronological, and petrological data, SESAR as a
        community platform for making samples more discoverable, accessible,
        and reusable, LEPR/traceDs for experimental liquid-solid phase
        equilibria data, and the Tephra Information Portal for discovery and
        access to curated tephra data.`,
      ],
    },
  },
};
