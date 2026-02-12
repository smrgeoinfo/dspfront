<template>
  <v-card flat class="metadata-form-step">
    <v-card-title class="text-h6">
      Metadata Form
    </v-card-title>
    <v-card-text>
      <div v-if="!selectedProfile" class="mb-4">
        <p class="text-body-1 mb-2">
          Select a metadata profile to fill in:
        </p>
        <v-select
          v-model="profileKey"
          :items="profiles"
          item-title="name"
          item-value="name"
          label="Metadata Profile"
          variant="outlined"
          density="compact"
          :loading="isLoadingProfiles"
        />
        <v-btn
          color="primary"
          variant="elevated"
          :disabled="!profileKey"
          @click="loadProfile"
        >
          Load Form
        </v-btn>
      </div>

      <div v-if="isLoadingSchema" class="d-flex justify-center mt-4">
        <v-progress-circular indeterminate color="primary" />
      </div>

      <template v-if="schema && !isLoadingSchema">
        <div class="d-flex align-center mb-4">
          <v-chip color="primary" variant="outlined" class="mr-2">
            {{ profileKey }}
          </v-chip>
          <v-btn variant="text" size="small" @click="changeProfile">
            Change Profile
          </v-btn>
        </div>

        <!-- New Variable dialog trigger -->
        <v-dialog v-model="showNewVariableDialog" max-width="520" persistent>
          <v-card>
            <v-card-title class="text-h6">
              New Variable
            </v-card-title>
            <v-card-text>
              <v-text-field
                v-model="newVariable.name"
                label="Name *"
                variant="outlined"
                density="compact"
                hint="Label for this variable as it appears in the dataset"
                persistent-hint
                class="mb-3"
              />
              <v-textarea
                v-model="newVariable.description"
                label="Description *"
                variant="outlined"
                density="compact"
                rows="2"
                hint="What this variable represents"
                persistent-hint
                class="mb-3"
              />
              <v-text-field
                v-model="newVariable.unitText"
                label="Unit (optional)"
                variant="outlined"
                density="compact"
                hint="e.g. degrees Celsius, mg/L, meters"
                persistent-hint
              />
            </v-card-text>
            <v-card-actions>
              <v-spacer />
              <v-btn variant="text" @click="showNewVariableDialog = false">
                Cancel
              </v-btn>
              <v-btn
                color="primary"
                variant="elevated"
                :disabled="!newVariable.name || !newVariable.description"
                @click="onCreateVariable"
              >
                Add Variable
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>

        <div class="d-flex justify-end mb-4">
          <v-btn variant="outlined" class="mr-auto" @click="triggerFileInput">
            Load from File
          </v-btn>
          <input
            ref="fileInput"
            type="file"
            accept=".json"
            style="display: none"
            @change="onFileSelected"
          >
        </div>

        <template v-if="isCategorization">
          <v-tabs v-model="activeTab" color="primary" class="mb-4">
            <v-tab
              v-for="(category, index) in categories"
              :key="index"
              :value="index"
            >
              {{ category.label }}
            </v-tab>
          </v-tabs>

          <v-tabs-window v-model="activeTab">
            <v-tabs-window-item
              v-for="(category, index) in categories"
              :key="index"
              :value="index"
            >
              <div v-if="category.label === 'Distribution' && commonFilePrefix" class="text-body-2 text-medium-emphasis mb-3 mt-1">
                Common file prefix: <code>{{ commonFilePrefix }}</code>
              </div>
              <cz-form
                ref="form"
                v-model="data"
                v-model:is-valid="tabValidity[index]"
                :schema="schema"
                :uischema="getCategoryUischema(index)"
                :config="formConfig"
                @update:model-value="onDataChange"
              />
            </v-tabs-window-item>
          </v-tabs-window>
        </template>

        <cz-form
          v-else
          ref="form"
          v-model="data"
          v-model:is-valid="isValid"
          :schema="schema"
          :uischema="uischema"
          :config="formConfig"
          @update:model-value="onDataChange"
        />
      </template>
    </v-card-text>

    <v-card-actions>
      <v-btn variant="text" @click="$emit('back')">
        Back
      </v-btn>
      <v-spacer />
      <v-btn
        color="primary"
        variant="elevated"
        :disabled="!schema"
        @click="onContinue"
      >
        Continue to Review
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script lang="ts">
import { CzForm, Notifications } from '@cznethub/cznet-vue-core'
import { Component, Emit, Prop, toNative, Vue, Watch } from 'vue-facing-decorator'
import axios from 'axios'
import User from '~/models/user.model'
import { fetchUserInfo, generateVariableId, populateMaintainer, populateOnLoad } from '~/services/catalog'

const CATALOG_API = '/api/catalog'

// dataComponentType → productType lookup (from ADA-AnalyticalMethodsAndAttributes.xlsx product-component sheet)
const COMPONENT_TO_PRODUCT_TYPE: Record<string, string> = {
  basemap: 'Basemap',
  supplementalBasemap: 'Basemap',
  AIVAImage: 'Analysis Advanced Imaging and Visualization of Astromaterials (AIVA)',
  AMSProcessedData: 'Accelerator Mass Spectrometry (AMS)',
  AMSRawData: 'Accelerator Mass Spectrometry (AMS)',
  ARGTCollection: '⁴⁰Ar/³⁹Ar Geochronology and Thermochronology (ARGT)',
  ARGTRawData: '⁴⁰Ar/³⁹Ar Geochronology and Thermochronology (ARGT)',
  ARGTCaptionData: '⁴⁰Ar/³⁹Ar Geochronology and Thermochronology (ARGT)',
  ARGTSummaryData: '⁴⁰Ar/³⁹Ar Geochronology and Thermochronology (ARGT)',
  ARGTDocument: '⁴⁰Ar/³⁹Ar Geochronology and Thermochronology (ARGT)',
  DSCIndividualMeasurements: 'Differential Scanning Calorimetry (DSC)',
  DSCRawHeatFlux: 'Differential Scanning Calorimetry (DSC)',
  DSCProcessedHeatFlux: 'Differential Scanning Calorimetry (DSC)',
  DSCHeatFlow: 'Differential Scanning Calorimetry (DSC)',
  DSCResultsTabular: 'Differential Scanning Calorimetry (DSC)',
  EAIRMSCollection: 'Elemental Analysis-Isotope Ratio Mass Spectrometry (EA-IRMS)',
  EAIRMSRawData: 'Elemental Analysis-Isotope Ratio Mass Spectrometry (EA-IRMS)',
  EAIRMSProcessedData: 'Elemental Analysis-Isotope Ratio Mass Spectrometry (EA-IRMS)',
  EMPAImageMap: 'Electron Microprobe Analysis Image (EMPA)',
  EMPAImage: 'Electron Microprobe Analysis Image (EMPA)',
  EMPAQEATabular: 'Electron Microprobe Analysis Quantitative Elemental Abundances (EMPAQEA)',
  FTICRMSCube: 'Fourier Transform Ion Cyclotron Resonance Mass Spectrometry (FTICRMS) Cube',
  FTICRMSDataPlot: 'Fourier Transform Ion Cyclotron Resonance Mass Spectrometry (FTICRMS) Cube',
  FTICRMSTabular: 'Fourier Transform Ion Cyclotron Resonance Mass Spectrometry (FTICRMS) Tabular',
  GCMSCollection: 'Gas Chromatography-Mass Spectrometry (GCMS)',
  GCMSCube: 'Gas Chromatography-Mass Spectrometry (GCMS)',
  GCMSChromatogram: 'Gas Chromatography-Mass Spectrometry (GCMS)',
  GCMSSpectraPlot: 'Gas Chromatography-Mass Spectrometry (GCMS)',
  GCMSPeaks: 'Gas Chromatography-Mass Spectrometry (GCMS)',
  GPYCProcessedTabular: 'Gas Pycnometry (GPYC) Processed',
  GPYCRawTabular: 'Gas Pycnometry (GPYC) Raw',
  HRICPMSProcessed: 'High-resolution Inductively Coupled Plasma Mass Spectroscopy (HRICPMS) Processed',
  HRICPMSRaw: 'High-resolution Inductively Coupled Plasma Mass Spectroscopy (HRICPMS) Raw',
  ICPOESRawTabular: 'Inductively Coupled Plasma - Optical Emission Spectroscopy (ICPOES) Raw',
  ICPOESIntermediateTabular: 'Inductively Coupled Plasma - Optical Emission Spectroscopy (ICPOES) Intermediate',
  ICPOESProcessedTabular: 'Inductively Coupled Plasma - Optical Emission Spectroscopy (ICPOES) Processed',
  ICTabular: 'Ion Chromatography (IC)',
  L2MSCube: 'Microprobe Two-Step Laser Mass Spectrometry (L2MS)',
  L2MSOverviewImage: 'Microprobe Two-Step Laser Mass Spectrometry (L2MS)',
  L2MSSpectraPlot: 'Microprobe Two-Step Laser Mass Spectrometry (L2MS)',
  LAFProcessed: 'Laser Assisted Fluorination (LAF) Processed',
  LAFRaw: 'Laser Assisted Fluorination (LAF) Raw',
  LCMSCollection: 'Liquid Chromatography - Mass Spectrometry (LCMS) Collection',
  LCMSRawData: 'Liquid Chromatography - Mass Spectrometry (LCMS) Collection',
  LCMSChromatogram: 'Liquid Chromatography - Mass Spectrometry (LCMS) Collection',
  LCMSVisualization: 'Liquid Chromatography - Mass Spectrometry (LCMS) Collection',
  LCMSPeaks: 'Liquid Chromatography - Mass Spectrometry (LCMS) Collection',
  LITImage: 'Lock-In Thermography (LIT) image',
  LITPolarDataCollection: 'Lock-In Thermography (LIT) Collection',
  LITPolarPlotData: 'Lock-In Thermography (LIT) Collection',
  LITTabularData: 'Lock-In Thermography (LIT) Collection',
  MCICPMSCollection: 'Multi-Collector Inductively Coupled Plasma Mass Spectrometry (MCICPMS) Raw',
  MCICPMSRaw: 'Multi-Collector Inductively Coupled Plasma Mass Spectrometry (MCICPMS) Raw',
  MCICPMSTabular: 'Multi-Collector Inductively Coupled Plasma Mass Spectrometry (MCICPMS) processed',
  NanoSIMSRawText: 'Nanoscale Secondary Ion Mass Spectrometry (NanoSIMS) Raw',
  NanoSIMSRaw: 'Nanoscale Secondary Ion Mass Spectrometry (NanoSIMS) Raw',
  NanoSIMSImage: 'Nanoscale Secondary Ion Mass Spectrometry (NanoSIMS) Image',
  NanoSIMSTabular: 'Nanoscale Secondary Ion Mass Spectrometry (NanoSIMS) Tabular',
  NGNSMSProcessed: 'Noble Gas and Nitrogen Static Mass Spectrometry (NGNSMS) Processed',
  NGNSMSRaw: 'Noble Gas and Nitrogen Static Mass Spectrometry (NGNSMS) Raw',
  PSFDTabular: 'Particle Size Frequency Distribution (PSFD)',
  PSFDShapeFile: 'Particle Size Frequency Distribution (PSFD)',
  PSFDContextImage: 'Particle Size Frequency Distribution (PSFD)',
  QICPMSProcessedTabular: 'Quadrupole Inductively Coupled Plasma Mass Spectrometry (QICPMS) Processed',
  QICPMSRawTabular: 'Quadrupole Inductively Coupled Plasma Mass Spectrometry (QICPMS) Raw',
  QRISCalibratedImage: 'Quantitative Reflective Imaging System (QRIS) Calibrated',
  QRISRawImage: 'Quantitative Reflective Imaging System (QRIS) Raw',
  RAMANRawTabular: 'RAMAN Raw',
  RITOFNGMSSpectra: 'Resonance ionization time of flight noble gas mass spectrometry (RITOFNGMS) Spectra',
  RITOFNGMSTabular: 'Resonance ionization time of flight noble gas mass spectrometry (RITOFNGMS) Processed',
  SEMEBSDGrainImageMap: 'Scanning Electron Microscopy Electron Backscatter Diffraction (SEMEBSD) Grain Image',
  SEMEDSPointSpectraPlot: 'Scanning Electron Microscopy Energy Dispersive X-ray Spectroscopy (SEMEDS) Point Data',
  SEMEDSPointSpectraData: 'Scanning Electron Microscopy Energy Dispersive X-ray Spectroscopy (SEMEDS) Point Data',
  SEMEDSPointData: 'Scanning Electron Microscopy Energy Dispersive X-ray Spectroscopy (SEMEDS) Point Data',
  SEMImageMap: 'Scanning Electron Microscopy (SEM) Image',
  SEMImage: 'Scanning Electron Microscopy (SEM) Image',
  SIMSTabular: 'Secondary Ion Mass Spectrometry (SIMS) Tabular',
  SLSShapeModel: 'Structured Light Scanning (SLS) Shape Model',
  STEMEDSCube: 'Scanning Transmission Electron Microscopy Energy Dispersive X-ray Spectroscopy (STEMEDS) Cube',
  STEMEDSSpectraPlot: 'Scanning Transmission Electron Microscopy Energy Dispersive X-ray Spectroscopy (STEMEDS) Tabular',
  STEMEDSTabular: 'Scanning Transmission Electron Microscopy Energy Dispersive X-ray Spectroscopy (STEMEDS) Tabular',
  STEMEDSTomo: 'Scanning Transmission Electron Microscopy Energy Dispersive X-ray Spectroscopy (STEMEDS) Tomography',
  STEMEELSCube: 'Scanning Transmission Electron Microscopy Electron Energy-loss Spectra (STEMEELS) Cube',
  STEMEELSSpectraPlot: 'Scanning Transmission Electron Microscopy Electron Energy-loss Spectra (STEMEELS) Tabular',
  STEMEELSTabular: 'Scanning Transmission Electron Microscopy Electron Energy-loss Spectra (STEMEELS) Tabular',
  STEMImage: 'Scanning Transmission Electron Microscopy (STEM) Image',
  SVRUECTabular: 'Seismic Velocities and Rock Ultrasonic Elastic Constants (SVRUEC)',
  SVRUECWaveformPlot: 'Seismic Velocities and Rock Ultrasonic Elastic Constants (SVRUEC)',
  SVRUECWaveformData: 'Seismic Velocities and Rock Ultrasonic Elastic Constants (SVRUEC)',
  TEMImage: 'Transmission Electron Microscopy (TEM) Image',
  TEMPatternsImage: 'Transmission Electron Microscopy (TEM) Patterns Image',
  TOFSIMSMassSpectrumData: 'Time-of-flight secondary ion mass spectrometry (TOFSIMS)',
  TOFSIMSMassSpectrumPlot: 'Time-of-flight secondary ion mass spectrometry (TOFSIMS)',
  TOFSIMSIonImages: 'Time-of-flight secondary ion mass spectrometry (TOFSIMS)',
  UVFMImage: 'Fluorescence Microscopy (UVFM) Image',
  VLMImage: 'Visible Light Microscopy (VLM) Image',
  VLMVideo: 'Visible Light Microscopy (VLM) Image',
  VNMIRSpectralPoint: 'Visible, near-infrared, and mid-infrared Spectroscopy (VNMIR) Point',
  VNMIRSpectraPlot: 'Visible, near-infrared, and mid-infrared Spectroscopy (VNMIR) Point',
  XANESImageStack: 'X-ray Absorption Near Edge Structure Hyperspectral Image Stack (XANES)',
  XANESStackOverviewImage: 'X-ray Absorption Near Edge Structure Hyperspectral Image Stack (XANES)',
  XRDTabular: 'X-ray Diffraction (XRD) Tabular',
  XRDDiffractionPattern: 'X-ray Diffraction (XRD) Tabular',
  XRDIndexedImage: 'X-ray Diffraction (XRD) Tabular',
}

@Component({
  name: 'metadata-form-step',
  components: { CzForm },
})
class MetadataFormStep extends Vue {
  @Prop({ default: null }) sessionData!: any
  @Prop({ default: () => [] }) bundleFiles!: any[]

  profiles: { name: string; description: string }[] = []
  profileKey = ''
  selectedProfile: any = null
  isLoadingProfiles = false
  isLoadingSchema = false

  schema: any = null
  uischema: any = null
  data: any = {}
  isValid = false
  activeTab = 0
  tabValidity: boolean[] = []
  profileId: number | null = null

  commonFilePrefix = ''

  showNewVariableDialog = false
  newVariable = { name: '', description: '', unitText: '' }

  get formConfig() {
    return {
      restrict: true,
      trim: false,
      showUnfocusedDescription: false,
      hideRequiredAsterisk: false,
      collapseNewItems: false,
      breakHorizontal: false,
      initCollapsed: false,
      hideAvatar: false,
      hideArraySummaryValidation: false,
      vuetify: {
        commonAttrs: {
          'density': 'compact',
          'variant': 'outlined',
          'persistent-hint': true,
          'hide-details': false,
        },
      },
    }
  }

  get isCategorization(): boolean {
    return this.uischema?.type === 'Categorization'
  }

  get categories(): { label: string; elements: any[] }[] {
    if (!this.isCategorization) return []
    return this.uischema.elements || []
  }

  getCategoryUischema(index: number) {
    const category = this.categories[index]
    if (!category) return { type: 'VerticalLayout', elements: [] }
    return {
      type: 'VerticalLayout',
      elements: category.elements || [],
    }
  }

  async created() {
    await this.loadProfiles()
  }

  async loadProfiles() {
    this.isLoadingProfiles = true
    try {
      const resp = await axios.get(`${CATALOG_API}/profiles/`)
      this.profiles = resp.data.results || []
    }
    catch (e) {
      console.error('Failed to load profiles:', e)
    }
    finally {
      this.isLoadingProfiles = false
    }
  }

  async loadProfile() {
    if (!this.profileKey) return
    this.isLoadingSchema = true
    this.selectedProfile = this.profileKey

    try {
      const resp = await axios.get(`${CATALOG_API}/profiles/${this.profileKey}/`)
      this.profileId = resp.data.id
      this.schema = resp.data.schema
      this.uischema = resp.data.uischema
      this.data = resp.data.defaults || {}

      // Convert schema:distribution from array to object so the uischema
      // can lay out archive properties and file list as separate groups.
      this._flattenDistributionSchema()

      populateOnLoad(this.data)

      // Pre-populate from product YAML if available
      if (this.sessionData?.product_yaml) {
        this.prePopulateFromProductYaml(this.sessionData.product_yaml)
      }

      // Pre-populate from introspection if available (overrides product YAML)
      if (this.sessionData?.jsonld_draft) {
        this.data = { ...this.data, ...this.sessionData.jsonld_draft }
      }

      // Unwrap distribution array → object (data may come from jsonld_draft)
      if (Array.isArray(this.data['schema:distribution'])) {
        this.data['schema:distribution'] = this.data['schema:distribution'][0] || {}
      }

      // Pre-populate from bundle files — add variables from CSV columns
      this.prePopulateFromFiles()

      // Pre-populate distribution from bundle files
      this.prePopulateDistribution()

      // Auto-populate maintainer
      if (User.$state.isLoggedIn) {
        const userInfo = await fetchUserInfo()
        if (userInfo) {
          populateMaintainer(this.data, userInfo)
          this.data = { ...this.data }
        }
      }

      await this.updateVariableOptions()
    }
    catch (e: any) {
      console.error('Failed to load profile schema:', e)
    }
    finally {
      this.isLoadingSchema = false
    }
  }

  prePopulateFromFiles() {
    if (!this.bundleFiles?.length) return

    const variables: any[] = this.data['schema:variableMeasured'] || []

    for (const file of this.bundleFiles) {
      // CSV / Excel columns → variableMeasured
      if (file.inspection?.columns) {
        for (const col of file.inspection.columns) {
          const colLabel = typeof col === 'string' ? col : (col.label || col.name)
          if (!colLabel) continue
          const exists = variables.some((v: any) => v['schema:name'] === colLabel)
          if (!exists) {
            let desc = col.name && col.name !== colLabel ? col.name : colLabel
            if (desc.length < 10) desc = desc.padEnd(10, '.')
            const entry: any = {
              '@type': ['schema:PropertyValue', 'cdi:InstanceVariable'],
              'schema:name': colLabel,
              'schema:description': desc,
            }
            if (col.unit) entry['schema:unitText'] = col.unit
            if (col.min_val != null) entry['schema:minValue'] = col.min_val
            if (col.max_val != null) entry['schema:maxValue'] = col.max_val
            variables.push(entry)
          }
        }
      }

      // HDF5 / NetCDF variables → variableMeasured
      if (file.inspection?.variables) {
        for (const varInfo of file.inspection.variables) {
          const varName = typeof varInfo === 'string' ? varInfo : varInfo.name
          if (!varName) continue
          const exists = variables.some((v: any) => v['schema:name'] === varName)
          if (!exists) {
            let varDesc = varInfo.description || varInfo.long_name || varName
            if (varDesc.length < 10) varDesc = varDesc.padEnd(10, '.')
            const entry: any = {
              '@type': ['schema:PropertyValue', 'cdi:InstanceVariable'],
              'schema:name': varName,
              'schema:description': varDesc,
            }
            if (varInfo.unit) entry['schema:unitText'] = varInfo.unit
            if (varInfo.min_val != null) entry['schema:minValue'] = varInfo.min_val
            if (varInfo.max_val != null) entry['schema:maxValue'] = varInfo.max_val
            variables.push(entry)
          }
        }
      }
    }

    if (variables.length) {
      this.data['schema:variableMeasured'] = variables
      this.data = { ...this.data }
    }
  }

  /** Convert schema:distribution from array schema to object schema so
   *  the uischema can scope directly into its properties (archive info
   *  and hasPart file list) as separate top-level groups. */
  _flattenDistributionSchema() {
    const dist = this.schema?.properties?.['schema:distribution']
    if (dist?.type === 'array' && dist.items) {
      this.schema.properties['schema:distribution'] = {
        ...dist.items,
        description: dist.description || dist.items.description,
      }
    }
  }

  prePopulateDistribution() {
    if (!this.bundleFiles?.length) return
    // Don't overwrite if distribution was already populated (e.g. from jsonld_draft)
    const existing = this.data['schema:distribution']
    if (existing && typeof existing === 'object' && Object.keys(existing).length > 0) return

    // Use original filename from upload step (bundle_path is a server temp name)
    const zipName = this.sessionData?._originalFilename || 'bundle.zip'

    // Collect data files (excluding product YAML)
    const dataFiles = this.bundleFiles.filter(f => f.componentType !== 'Product description')

    // Derive common prefix from FileReviewStep's displayName stripping.
    // If the first file's basename differs from its displayName, the difference is the prefix.
    if (dataFiles.length > 0) {
      const firstBasename = dataFiles[0].path.replace(/^.*[\\/]/, '')
      if (firstBasename.endsWith(dataFiles[0].displayName) && firstBasename.length > dataFiles[0].displayName.length) {
        this.commonFilePrefix = firstBasename.slice(0, firstBasename.length - dataFiles[0].displayName.length)
      } else {
        this.commonFilePrefix = ''
      }
    }

    // Build hasPart entries — use displayName (already prefix-stripped by FileReviewStep)
    const hasPart: any[] = []
    for (const file of dataFiles) {
      const part: any = {
        '@type': ['schema:DataDownload'],
        'schema:name': file.displayName,
        'schema:encodingFormat': file.mimeType,
      }

      if (file.componentType) {
        part['schema:additionalType'] = [file.componentType]
      }

      if (file.inspection?.size) {
        part['schema:size'] = {
          '@type': 'schema:QuantitativeValue',
          'schema:value': file.inspection.size,
          'schema:unitText': 'byte',
        }
      }

      // Use PDF/text extracted description if available
      if (file.inspection?.description) {
        part['schema:description'] = file.inspection.description
      }

      // Build fileDetail with physical mapping for tabular/structured data
      if (file.inspection?.columns?.length) {
        const fd: any = {}
        // CSV/delimited metadata
        if (file.inspection.delimiter) {
          fd['csvw:delimiter'] = file.inspection.delimiter
          fd['csvw:header'] = true
          fd['csvw:headerRowCount'] = 1
        }
        if (file.inspection.row_count != null) fd['countRows'] = file.inspection.row_count
        fd['countColumns'] = file.inspection.columns.length

        // Physical mapping: one entry per column, linking index → variable name
        fd['cdi:hasPhysicalMapping'] = file.inspection.columns.map((col: any) => {
          const label = typeof col === 'string' ? col : (col.label || col.name)
          const entry: any = {
            'cdi:index': col.index ?? 0,
            'cdi:formats_InstanceVariable': label,
          }
          if (col.data_type) entry['cdi:physicalDataType'] = col.data_type
          return entry
        })

        part['fileDetail'] = fd
        part['_showPhysicalStructure'] = true
      }
      // HDF5/NetCDF variables → physical mapping
      else if (file.inspection?.variables?.length) {
        const fd: any = {}
        fd['cdi:hasPhysicalMapping'] = file.inspection.variables.map((v: any, idx: number) => {
          const entry: any = {
            'cdi:index': idx,
            'cdi:formats_InstanceVariable': v.name,
          }
          if (v.data_type) entry['cdi:physicalDataType'] = v.data_type
          if (v.path) entry['cdi:locator'] = v.path
          return entry
        })

        part['fileDetail'] = fd
        part['_showPhysicalStructure'] = true
      }

      hasPart.push(part)
    }

    // Archive size from introspection (actual ZIP file size on disk)
    const archiveSize = this.sessionData?.introspection_result?.archive_size || 0

    // Single object (schema was flattened from array → object)
    this.data['schema:distribution'] = {
      '@type': ['schema:DataDownload'],
      'schema:name': zipName,
      'schema:encodingFormat': 'application/zip',
      'schema:description': 'This data product is distributed in a zip archive; contents of the archive are listed as parts. The component files are not individually accessible.',
      'schema:size': {
        '@type': 'schema:QuantitativeValue',
        'schema:value': archiveSize,
        'schema:unitText': 'byte',
      },
      'schema:hasPart': hasPart,
    }
    this.data = { ...this.data }
  }

  prePopulateFromProductYaml(py: any) {
    if (!py || typeof py !== 'object') return

    // Title / description
    if (py.title) this.data['schema:name'] = py.title
    if (py.abstract) this.data['schema:description'] = py.abstract

    // DOI → schema:identifier (simple string on adaProduct)
    if (py.doi) {
      this.data['schema:identifier'] = py.doi
    }

    // Product type from dataComponentType lookup
    if (py.dataComponentType) {
      const ct = typeof py.dataComponentType === 'string' ? py.dataComponentType : py.dataComponentType[0]
      const productType = COMPONENT_TO_PRODUCT_TYPE[ct]
      if (productType) {
        const existing: string[] = this.data['schema:additionalType'] || []
        if (!existing.includes(productType)) {
          this.data['schema:additionalType'] = [productType, ...existing]
        }
      }
    }

    // Publication year
    if (py.publicationYear) {
      this.data['schema:datePublished'] = String(py.publicationYear)
    }

    // Analysis date
    if (py.analysisDate) {
      this.data['schema:dateCreated'] = py.analysisDate
    }

    // Creators (dataProductCreator)
    if (Array.isArray(py.dataProductCreator) && py.dataProductCreator.length) {
      this.data['schema:creator'] = {
        '@list': py.dataProductCreator.map((p: any) => this._personToJsonld(p)),
      }
    }

    // Contributors — instrumentOperator + dataAnalyst with roles
    const contributors: any[] = []
    if (Array.isArray(py.instrumentOperator)) {
      for (const p of py.instrumentOperator) {
        contributors.push(this._contributorWithRole(p, 'Instrument Operator'))
      }
    }
    if (Array.isArray(py.dataAnalyst)) {
      for (const p of py.dataAnalyst) {
        contributors.push(this._contributorWithRole(p, 'Data Analyst'))
      }
    }
    if (contributors.length) {
      this.data['schema:contributor'] = contributors
    }

    // Funding (may be a string or object)
    if (py.funding) {
      const fundingText = typeof py.funding === 'string' ? py.funding : JSON.stringify(py.funding)
      if (fundingText && !this.data['schema:funding']?.length) {
        this.data['schema:funding'] = [{
          '@type': 'schema:MonetaryGrant',
          'schema:name': fundingText,
          'schema:identifier': '',
          'schema:funder': {
            '@type': 'schema:Organization',
            'schema:name': '',
          },
        }]
      }
    }

    // Analysis Events → prov:wasGeneratedBy
    {
      const activity: any = { '@type': 'prov:Activity' }

      // sessionId → Session ID
      if (py.sessionId) activity['schema:identifier'] = py.sessionId

      // analysisDate → Start Date
      if (py.analysisDate) activity['schema:startDate'] = py.analysisDate

      // instrument → Instruments (prov:used array)
      if (py.instrument && typeof py.instrument === 'object') {
        activity['prov:used'] = [{
          '@type': 'schema:Thing',
          'schema:name': py.instrument.name || '',
          'schema:identifier': py.instrument.identifier || '',
        }]
      }

      // institution → Laboratory (schema:location)
      if (py.institution && typeof py.institution === 'object') {
        activity['schema:location'] = {
          '@type': 'schema:Place',
          'schema:name': py.institution.name || '',
          'schema:identifier': py.institution.ror || '',
        }
      }

      // sampleIdentifier → Samples (schema:mainEntity)
      // Create one entry per sample. Also scan column headers for
      // standard persistent identifiers (IGSN, DOI, ARK).
      {
        const sampleSet = new Set<string>()

        // From product YAML (may be string or array)
        if (py.sampleIdentifier) {
          const ids = Array.isArray(py.sampleIdentifier) ? py.sampleIdentifier : [py.sampleIdentifier]
          for (const id of ids) {
            if (typeof id === 'string' && id.trim()) sampleSet.add(id.trim())
          }
        }

        // Scan inspected column headers for sample identifiers:
        // standard PIDs (IGSN, DOI, ARK) and OREX- identifiers
        const stdIdRe = /(?:https?:\/\/)?(?:igsn\.org|doi\.org|n2t\.net\/ark:)[^\s,;)}\]]+|(?:igsn|doi|ark):[^\s,;)}\]]+|OREX-\d+(?:-\d+)*/gi
        if (this.bundleFiles?.length) {
          for (const file of this.bundleFiles) {
            for (const col of file.inspection?.columns || []) {
              const label = typeof col === 'string' ? col : (col.label || col.name || '')
              let m
              while ((m = stdIdRe.exec(label)) !== null) {
                sampleSet.add(m[0])
              }
            }
          }
        }

        // Create one schema:mainEntity entry per unique sample
        if (sampleSet.size > 0) {
          activity['schema:mainEntity'] = [...sampleSet].map(id => ({
            '@type': ['schema:Thing', 'https://w3id.org/isample/vocabulary/materialsampleobjecttype/materialsample'],
            'schema:identifier': id,
          }))
        }
      }

      // Only add if we have at least some data
      const hasData = activity['schema:identifier'] || activity['schema:startDate']
        || activity['prov:used'] || activity['schema:location'] || activity['schema:mainEntity']
      if (hasData) {
        this.data['prov:wasGeneratedBy'] = [activity]
      }
    }

    // Measurement technique from analysisTechniqueName
    if (py.analysisTechniqueName) {
      this.data['schema:measurementTechnique'] = {
        '@type': 'schema:DefinedTerm',
        'schema:name': py.analysisTechniqueName,
        'schema:identifier': py.analysisTechniqueIdentifier || '',
      }
    }

    // Keywords from analysisTechniqueName and dataComponentType
    const keywords: string[] = []
    if (py.analysisTechniqueName) keywords.push(py.analysisTechniqueName)
    if (py.analysisTechniqueIdentifier) keywords.push(py.analysisTechniqueIdentifier)
    if (py.dataComponentType) {
      const types = Array.isArray(py.dataComponentType) ? py.dataComponentType : [py.dataComponentType]
      keywords.push(...types)
    }
    // Include all discovered sample IDs as keywords
    const activities = this.data['prov:wasGeneratedBy'] || []
    if (activities.length) {
      const samples = activities[0]['schema:mainEntity'] || []
      for (const s of samples) {
        const sid = s['schema:identifier']
        if (sid) keywords.push(`Sample: ${sid}`)
      }
    } else if (py.sampleIdentifier) {
      keywords.push(`Sample: ${py.sampleIdentifier}`)
    }
    if (keywords.length) {
      this.data['schema:keywords'] = keywords
    }

    // Trigger reactivity
    this.data = { ...this.data }
  }

  _personToJsonld(p: any): any {
    const person: any = { '@type': 'schema:Person' }
    if (p.name) person['schema:name'] = p.name
    if (p.orcid) person['schema:identifier'] = p.orcid
    if (p.email) person['schema:email'] = p.email
    if (p.affiliation) {
      person['schema:affiliation'] = {
        '@type': 'schema:Organization',
        'schema:name': p.affiliation,
      }
    }
    return person
  }

  _contributorWithRole(p: any, roleName: string): any {
    const person = this._personToJsonld(p)
    person['schema:roleName'] = roleName
    return person
  }

  changeProfile() {
    this.selectedProfile = null
    this.schema = null
    this.uischema = null
  }

  onDataChange() {
    this._normalizeDateTimeFields()
    this.updateVariableOptions()
  }

  /** Auto-append T00:00:00Z to date-only strings for fields with format: date-time */
  _normalizeDateTimeFields() {
    const dateOnlyRe = /^\d{4}-\d{2}-\d{2}$/
    const subjectOf = this.data?.['schema:subjectOf']
    if (subjectOf && typeof subjectOf === 'object') {
      const val = subjectOf['schema:sdDatePublished']
      if (typeof val === 'string' && dateOnlyRe.test(val)) {
        subjectOf['schema:sdDatePublished'] = val + 'T00:00:00Z'
      }
    }
  }

  async updateVariableOptions() {
    if (!this.schema || !this.data) return

    const variables: { name: string; id: string }[] = []
    for (const v of this.data['schema:variableMeasured'] || []) {
      if (v && typeof v === 'object' && v['schema:name']) {
        const name = v['schema:name']
        const id = v['@id'] || await generateVariableId(name)
        if (!v['@id']) v['@id'] = id
        variables.push({ name, id })
      }
    }

    if (!variables.length) return

    const nameEnum = variables.map(v => v.name)
    this._setFormatsVariableEnum(this.schema, nameEnum)
  }

  _setFormatsVariableEnum(node: any, enumValues: string[]) {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node)) {
      for (const item of node) this._setFormatsVariableEnum(item, enumValues)
      return
    }
    const props = node.properties
    if (props && props['cdi:formats_InstanceVariable']) {
      const fiv = props['cdi:formats_InstanceVariable']
      if (fiv.type === 'string') fiv.enum = enumValues
    }
    if (props) {
      for (const key of Object.keys(props))
        this._setFormatsVariableEnum(props[key], enumValues)
    }
    if (node.items) this._setFormatsVariableEnum(node.items, enumValues)
  }

  async onCreateVariable() {
    const name = this.newVariable.name.trim()
    const description = this.newVariable.description.trim()
    if (!name || !description) return

    const id = await generateVariableId(name)
    const variable: any = {
      '@type': ['schema:PropertyValue', 'cdi:InstanceVariable'],
      '@id': id,
      'schema:name': name,
      'schema:description': description,
    }
    if (this.newVariable.unitText.trim())
      variable['schema:unitText'] = this.newVariable.unitText.trim()

    if (!this.data['schema:variableMeasured'])
      this.data['schema:variableMeasured'] = []

    this.data['schema:variableMeasured'].push(variable)
    this.data = { ...this.data }

    await this.updateVariableOptions()

    this.newVariable = { name: '', description: '', unitText: '' }
    this.showNewVariableDialog = false

    Notifications.toast({ message: `Variable "${name}" added.`, type: 'success' })
  }

  triggerFileInput() {
    (this.$refs.fileInput as HTMLInputElement).click()
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string)
        this.data = parsed
      }
      catch (err) {
        console.error('Failed to parse JSON file:', err)
        Notifications.toast({ message: 'Failed to parse JSON file.', type: 'error' })
      }
    }
    reader.readAsText(file)
    input.value = ''
  }

  @Emit('continue')
  onContinue() {
    this._normalizeDateTimeFields()
    // Wrap distribution object back to array for the canonical schema
    const output = { ...this.data }
    if (output['schema:distribution'] && !Array.isArray(output['schema:distribution'])) {
      output['schema:distribution'] = [output['schema:distribution']]
    }
    return {
      data: output,
      profileId: this.profileId,
      profileKey: this.profileKey,
    }
  }
}

export default toNative(MetadataFormStep)
</script>

<style lang="scss">
.metadata-form-step {
  // --------------------------------------------------
  // Compact group spacing
  // --------------------------------------------------
  .cz-group.my-5 {
    margin-top: 4px !important;
    margin-bottom: 4px !important;
  }
  .cz-group > .v-card-text {
    padding-top: 4px;
    padding-bottom: 2px;
  }

  // --------------------------------------------------
  // Tight field spacing (~6pt between fields)
  // --------------------------------------------------
  .v-input {
    margin-bottom: 2px !important;
  }

  // --------------------------------------------------
  // Hover-to-show hints: hide descriptions/hints by
  // default, reveal on hover or focus. Validation
  // errors always remain visible.
  // --------------------------------------------------

  // Collapse the details row (hint area) when idle
  .v-input:not(.v-input--error) .v-input__details {
    max-height: 0;
    min-height: 0 !important;
    padding: 0 !important;
    overflow: hidden;
    transition: max-height 0.15s ease;
  }

  // Expand on hover or when a child input has focus
  .v-input:not(.v-input--error):hover .v-input__details,
  .v-input:not(.v-input--error):focus-within .v-input__details {
    max-height: 48px;
    min-height: unset !important;
    padding: 4px 16px 0 !important;
    overflow: visible;
  }
}
</style>
