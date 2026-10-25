export interface FeatureCategory {
  name: string;
  examples: string[];
}

export interface DatasetInfo {
  name: string;
  fullName: string;
  color: string;
  colorVar: string;
  aliases: string[];
  purpose: string;
  description: string;
  sourceFormat: string;
  trainRecords: number;
  testRecords: number;
  featureCount: string;
  categorical: string[];
  featureCategories: FeatureCategory[];
  labelDefinition: string;
  labelNotes: string[];
}

export const DATASETS: DatasetInfo[] = [
  {
    name: 'UNSW-NB15',
    fullName: 'UNSW-NB15 Network Intrusion Dataset',
    color: '#22D3EE',
    colorVar: 'cyan',
    aliases: ['unsw-nb15', 'unsw_nb15', 'unswnb15', 'unsw nb15', 'unsw'],
    purpose: 'Modern benchmark of normal and synthetic attack network traffic for evaluating intrusion detection systems.',
    description:
      'Created at the Australian Centre for Cyber Security (UNSW Canberra) with the IXIA PerfectStorm tool, mixing realistic modern normal activity with contemporary attack behaviour. The official partitioned training and testing sets are used as supplied.',
    sourceFormat: 'Parquet (official training / testing partitions)',
    trainRecords: 175341,
    testRecords: 82332,
    featureCount: '42 descriptive features',
    categorical: ['proto', 'service', 'state'],
    featureCategories: [
      { name: 'Flow & basic', examples: ['dur', 'proto', 'service', 'state', 'spkts', 'dpkts', 'sbytes', 'dbytes'] },
      { name: 'Content & TTL', examples: ['sttl', 'dttl', 'swin', 'dwin', 'trans_depth', 'response_body_len'] },
      { name: 'Time & load', examples: ['rate', 'sload', 'dload', 'sinpkt', 'dinpkt', 'sjit', 'djit', 'tcprtt'] },
      { name: 'Connection counters', examples: ['ct_srv_src', 'ct_state_ttl', 'ct_dst_ltm', 'ct_src_ltm', 'ct_srv_dst'] },
    ],
    labelDefinition: 'label column — 0 = Normal, 1 = Attack',
    labelNotes: ['The multi-class attack_cat column is not used as the binary target.'],
  },
  {
    name: 'NSL-KDD',
    fullName: 'NSL-KDD Intrusion Detection Dataset',
    color: '#8B5CF6',
    colorVar: 'violet',
    aliases: ['nsl-kdd', 'nsl_kdd', 'nslkdd', 'nsl kdd', 'kdd', 'nsl'],
    purpose: 'Refined version of KDD Cup ’99 that removes redundant records — a widely used IDS research benchmark.',
    description:
      'Proposed by Tavallaee et al. (2009) to address duplicate records in KDD Cup ’99. KDDTrain+ and KDDTest+ are supplied as comma-separated TXT files and used as the predefined train/test split.',
    sourceFormat: 'CSV-like TXT (KDDTrain+, KDDTest+)',
    trainRecords: 125973,
    testRecords: 22544,
    featureCount: '41 features',
    categorical: ['protocol_type', 'service', 'flag'],
    featureCategories: [
      { name: 'Basic connection', examples: ['duration', 'protocol_type', 'service', 'flag', 'src_bytes', 'dst_bytes'] },
      { name: 'Content', examples: ['hot', 'num_failed_logins', 'logged_in', 'root_shell', 'num_file_creations'] },
      { name: 'Time-based traffic', examples: ['count', 'srv_count', 'serror_rate', 'same_srv_rate', 'diff_srv_rate'] },
      { name: 'Host-based traffic', examples: ['dst_host_count', 'dst_host_srv_count', 'dst_host_same_srv_rate'] },
    ],
    labelDefinition: 'Raw label string mapped to binary — "normal" = 0, any attack type = 1',
    labelNotes: ['The difficulty-level column is not a predictive feature.'],
  },
];

const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

export function canonicalDatasetName(raw: string): string {
  const trimmed = raw.trim();
  const sq = squash(trimmed);
  for (const d of DATASETS) {
    if (squash(d.name) === sq || d.aliases.some((a) => squash(a) === sq)) return d.name;
  }
  return trimmed;
}

export function getDatasetInfo(name: string): DatasetInfo | undefined {
  return DATASETS.find((d) => d.name === name);
}

const FALLBACK = ['#F59E0B', '#F472B6', '#4ADE80'];

export function datasetColor(name: string, index = 0): string {
  return getDatasetInfo(name)?.color ?? FALLBACK[index % FALLBACK.length];
}

export function datasetOrder(name: string): number {
  const i = DATASETS.findIndex((d) => d.name === name);
  return i === -1 ? 999 : i;
}
