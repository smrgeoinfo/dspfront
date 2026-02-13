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
      actions: {
        createMetadata: {
          label: `Create Metadata for Geochemical Dataset`,
          description: `Generate standardized metadata for analytical geochemistry datasets using community-defined templates.`,
        },
        submitData: {
          label: `Submit Data Products`,
          description: `Assemble your data files and metadata using our templates and submit directly to a supported repository.`,
        },
        findRepo: {
          label: `Find the Right Repository`,
          description: `Don't know which repository to use? Use our repository recommendation system to find the best place for your data.`,
        },
        registerDataset: {
          label: `Register Dataset`,
          description: `Register a dataset with CDIF discovery metadata to make it findable across catalogs and repositories.`,
        },
        registerSamples: {
          label: `Register Samples`,
          description: `Register metadata for samples and get an IGSN to make samples more discoverable, accessible, and reusable.`,
        },
      },
    },
    metadata: {
      ada: {
        title: `Create Metadata for Geochemical Dataset`,
        description: `Select the type of analytical dataset you want to describe. Each profile provides a tailored metadata form for a specific analytical technique.`,
        profiles: {
          adaProduct: {
            name: `General Geochemical Product`,
            description: `General-purpose metadata for geochemical analytical data products that don't fit a specific technique profile.`,
          },
          adaEMPA: {
            name: `Electron Microprobe Analysis (EMPA)`,
            description: `Metadata for electron microprobe analysis datasets, including mineral compositions and element mapping.`,
          },
          adaXRD: {
            name: `X-Ray Diffraction (XRD)`,
            description: `Metadata for X-ray diffraction datasets, including mineral identification and crystal structure analysis.`,
          },
          adaICPMS: {
            name: `ICP Mass Spectrometry (ICP-MS)`,
            description: `Metadata for inductively coupled plasma mass spectrometry datasets, including trace element and isotopic analyses.`,
          },
          adaVNMIR: {
            name: `Visible-Near-Mid Infrared Spectroscopy (VNMIR)`,
            description: `Metadata for visible, near-infrared, and mid-infrared spectroscopy datasets.`,
          },
          adaAIVA: {
            name: `AI-driven Visual Analysis (AIVA)`,
            description: `Metadata for AI-driven visual analysis imaging datasets.`,
          },
          adaAMS: {
            name: `Accelerator Mass Spectrometry (AMS)`,
            description: `Metadata for accelerator mass spectrometry isotope analysis datasets.`,
          },
          adaARGT: {
            name: `Argon Geochronology and Thermochronology (ARGT)`,
            description: `Metadata for argon geochronology and thermochronology dating analysis datasets.`,
          },
          adaDSC: {
            name: `Differential Scanning Calorimetry (DSC)`,
            description: `Metadata for differential scanning calorimetry thermal analysis datasets.`,
          },
          adaEAIRMS: {
            name: `Elemental Analysis - Isotope Ratio Mass Spectrometry (EA-IRMS)`,
            description: `Metadata for elemental analysis coupled with isotope ratio mass spectrometry datasets.`,
          },
          adaFTICRMS: {
            name: `Fourier Transform Ion Cyclotron Resonance Mass Spectrometry (FTICR-MS)`,
            description: `Metadata for Fourier transform ion cyclotron resonance mass spectrometry datasets.`,
          },
          adaGCMS: {
            name: `Gas Chromatography Mass Spectrometry (GC-MS)`,
            description: `Metadata for gas chromatography mass spectrometry analysis datasets.`,
          },
          adaGPYC: {
            name: `Gas Pycnometry (GPYC)`,
            description: `Metadata for gas pycnometry density measurement datasets.`,
          },
          adaIC: {
            name: `Ion Chromatography (IC)`,
            description: `Metadata for ion chromatography analysis datasets.`,
          },
          adaICPOES: {
            name: `Inductively Coupled Plasma Optical Emission Spectrometry (ICP-OES)`,
            description: `Metadata for inductively coupled plasma optical emission spectrometry datasets.`,
          },
          adaL2MS: {
            name: `Two-Step Laser Mass Spectrometry (L2MS)`,
            description: `Metadata for two-step laser desorption/ionization mass spectrometry datasets.`,
          },
          adaLAF: {
            name: `Laser-Assisted Fluorination (LAF)`,
            description: `Metadata for laser-assisted fluorination isotope analysis datasets.`,
          },
          adaLCMS: {
            name: `Liquid Chromatography Mass Spectrometry (LC-MS)`,
            description: `Metadata for liquid chromatography mass spectrometry analysis datasets.`,
          },
          adaLIT: {
            name: `Lock-In Thermography (LIT)`,
            description: `Metadata for lock-in thermography imaging and data collection datasets.`,
          },
          adaNGNSMS: {
            name: `Noble Gas and Nitrogen Static Mass Spectrometry (NG-NS-MS)`,
            description: `Metadata for noble gas and nitrogen static mass spectrometry analysis datasets.`,
          },
          adaNanoIR: {
            name: `Nano-Infrared Spectroscopy (NanoIR)`,
            description: `Metadata for nano-infrared spectroscopy and photothermal imaging datasets.`,
          },
          adaNanoSIMS: {
            name: `Nanoscale Secondary Ion Mass Spectrometry (NanoSIMS)`,
            description: `Metadata for nanoscale secondary ion mass spectrometry imaging and analysis datasets.`,
          },
          adaPSFD: {
            name: `Particle Size-Frequency Distribution (PSFD)`,
            description: `Metadata for particle size-frequency distribution analysis datasets.`,
          },
          adaQRIS: {
            name: `Quantitative Reflectance Imaging Spectroscopy (QRIS)`,
            description: `Metadata for quantitative reflectance imaging spectroscopy datasets.`,
          },
          adaRAMAN: {
            name: `Raman Spectroscopy (RAMAN)`,
            description: `Metadata for Raman spectroscopy vibrational analysis datasets.`,
          },
          adaRITOFNGMS: {
            name: `Resonance Ionization Time-of-Flight Noble Gas Mass Spectrometry (RI-TOF-NGMS)`,
            description: `Metadata for resonance ionization time-of-flight noble gas mass spectrometry datasets.`,
          },
          adaSEM: {
            name: `Scanning Electron Microscopy (SEM)`,
            description: `Metadata for scanning electron microscopy imaging and analysis datasets.`,
          },
          adaSIMS: {
            name: `Secondary Ion Mass Spectrometry (SIMS)`,
            description: `Metadata for secondary ion mass spectrometry analysis datasets.`,
          },
          adaSLS: {
            name: `Structured Light Scanning (SLS)`,
            description: `Metadata for structured light scanning 3D surface reconstruction datasets.`,
          },
          adaSVRUEC: {
            name: `Seismic Velocities and Rock Ultrasonic Elastic Constants (SV-RUEC)`,
            description: `Metadata for seismic velocities and rock ultrasonic elastic constants measurement datasets.`,
          },
          adaTEM: {
            name: `Transmission Electron Microscopy (TEM)`,
            description: `Metadata for transmission electron microscopy imaging and spectroscopy datasets.`,
          },
          adaToFSIMS: {
            name: `Time-of-Flight Secondary Ion Mass Spectrometry (ToF-SIMS)`,
            description: `Metadata for time-of-flight secondary ion mass spectrometry surface analysis datasets.`,
          },
          adaUVFM: {
            name: `Ultraviolet Fluorescence Microscopy (UVFM)`,
            description: `Metadata for ultraviolet fluorescence microscopy imaging datasets.`,
          },
          adaVLM: {
            name: `Visible Light Microscopy (VLM)`,
            description: `Metadata for visible light microscopy imaging datasets.`,
          },
          adaXANES: {
            name: `X-ray Absorption Near Edge Structure (XANES)`,
            description: `Metadata for X-ray absorption near edge structure spectroscopy datasets.`,
          },
          adaXCT: {
            name: `X-ray Computed Tomography (XCT)`,
            description: `Metadata for X-ray computed tomography 3D imaging datasets.`,
          },
          CDIFxas: {
            name: `X-Ray Absorption Spectroscopy (XAS)`,
            description: `CDIF metadata for XAS datasets, including X-ray source, monochromator, sample, absorption edge, and target element.`,
          },
        },
      },
      cdif: {
        title: `Register Dataset with CDIF Metadata`,
        description: `Create a CDIF Discovery metadata record to make your dataset findable across catalogs and repositories.`,
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
        `The IEDA Earth Science Data Submission Portal provides tools for determining which repository to use for data submission along with enhanced submission tools to encourage data standards, complete metadata, and high-quality submissions.`,
      ],
      portalFeatures: [
        {
          title: `Which repository?`,
          description: `Use the Portal's repository recommendation system to determine which repository is right for submitting your research products.`,
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
};
