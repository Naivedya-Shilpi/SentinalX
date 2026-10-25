export interface ModelInfo {
  name: string;
  short: string;
  family: string;
  sparkClass: string;
  color: string;
  aliases: string[];
  summary: string;
  traits: { title: string; text: string }[];
  limitations: string[];
}

/** General algorithm characteristics. These are textbook properties, NOT experimental findings. */
export const MODELS: ModelInfo[] = [
  {
    name: 'Logistic Regression',
    short: 'LR',
    family: 'Linear model',
    sparkClass: 'pyspark.ml.classification.LogisticRegression',
    color: '#60A5FA',
    aliases: ['logistic regression', 'logisticregression', 'lr', 'logreg', 'logistic'],
    summary: 'Models the log-odds of an attack as a weighted sum of features.',
    traits: [
      { title: 'Linear decision boundary', text: 'Separates classes with a single hyperplane in the scaled feature space.' },
      { title: 'Interpretability', text: 'Coefficients indicate the direction and strength of each feature’s association with the attack class.' },
      { title: 'Efficient baseline', text: 'Fast to train on Spark and a standard reference point for more complex models.' },
    ],
    limitations: ['Cannot capture nonlinear feature interactions unless they are engineered explicitly.'],
  },
  {
    name: 'Random Forest',
    short: 'RF',
    family: 'Tree ensemble · bagging',
    sparkClass: 'pyspark.ml.classification.RandomForestClassifier',
    color: '#34D399',
    aliases: ['random forest', 'randomforest', 'rf', 'randomforestclassifier', 'random forest classifier'],
    summary: 'Averages many decision trees trained on bootstrap samples and random feature subsets.',
    traits: [
      { title: 'Ensemble of decision trees', text: 'Combines many decorrelated trees to reduce variance.' },
      { title: 'Nonlinear relationships', text: 'Tree splits capture thresholds and interactions without manual feature engineering.' },
      { title: 'Robustness', text: 'Generally less sensitive to noisy features and outliers than a single tree.' },
    ],
    limitations: ['Less transparent than linear models; individual predictions are harder to explain.'],
  },
  {
    name: 'Linear SVC',
    short: 'LSVC',
    family: 'Linear · max-margin',
    sparkClass: 'pyspark.ml.classification.LinearSVC',
    color: '#F472B6',
    aliases: ['linear svc', 'linearsvc', 'svc', 'svm', 'linear svm', 'lsvc', 'support vector classifier', 'linear support vector classifier'],
    summary: 'Finds the separating hyperplane that maximises the margin between classes (hinge loss).',
    traits: [
      { title: 'Maximum-margin classification', text: 'Optimises the distance between the decision boundary and the nearest training points.' },
      { title: 'Linear separation', text: 'Like logistic regression, it draws a linear boundary in feature space.' },
      { title: 'High-dimensional support', text: 'Works well with wide, sparse vectors such as one-hot encoded categories.' },
    ],
    limitations: ['Outputs raw margins rather than calibrated probabilities.'],
  },
  {
    name: 'Gradient-Boosted Trees',
    short: 'GBT',
    family: 'Tree ensemble · boosting',
    sparkClass: 'pyspark.ml.classification.GBTClassifier',
    color: '#22D3EE',
    aliases: ['gradient-boosted trees', 'gradient boosted trees', 'gbt', 'gbtclassifier', 'gradient boosting', 'gradientboostedtrees', 'gb trees', 'gbdt'],
    summary: 'Builds shallow trees sequentially, each one correcting the errors of the ensemble so far.',
    traits: [
      { title: 'Sequential tree boosting', text: 'Each new tree is fitted to the residual errors of the previous ensemble.' },
      { title: 'Complex feature interactions', text: 'Captures nonlinear, multi-feature patterns.' },
      { title: 'Strong predictive capability', text: 'Often among the strongest algorithms on tabular data.' },
    ],
    limitations: ['Sequential training is slower to parallelise; more hyperparameters to tune.'],
  },
  {
    name: 'Naive Bayes',
    short: 'NB',
    family: 'Probabilistic',
    sparkClass: 'pyspark.ml.classification.NaiveBayes (modelType="multinomial")',
    color: '#A78BFA',
    aliases: ['naive bayes', 'naivebayes', 'nb', 'multinomial naive bayes', 'multinomialnb', 'multinomial nb', 'mnb'],
    summary: 'Applies Bayes’ theorem assuming features are conditionally independent given the class.',
    traits: [
      { title: 'Probabilistic classification', text: 'Estimates class-conditional likelihoods and combines them with class priors.' },
      { title: 'Conditional independence assumption', text: 'Treats every feature as independent given the label, which rarely holds for traffic features.' },
      { title: 'Requires nonnegative features', text: 'Multinomial NB expects count-like, nonnegative inputs, which is why scaled features are needed.' },
    ],
    limitations: [
      'Multinomial likelihoods are designed for counts; continuous traffic measurements (durations, byte rates) are a poor fit.',
    ],
  },
];

const aliasIndex = new Map<string, ModelInfo>();
for (const m of MODELS) {
  aliasIndex.set(m.name.toLowerCase(), m);
  for (const a of m.aliases) aliasIndex.set(a, m);
}

const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Map a free-form model name (e.g. "GBTClassifier") to its canonical name. Unknown names are kept as-is (trimmed). */
export function canonicalModelName(raw: string): string {
  const trimmed = raw.trim().replace(/\s+/g, ' ');
  const lower = trimmed.toLowerCase();
  const hit = aliasIndex.get(lower);
  if (hit) return hit.name;
  const sq = squash(trimmed);
  for (const [alias, info] of aliasIndex) if (squash(alias) === sq) return info.name;
  return trimmed;
}

export function getModelInfo(name: string): ModelInfo | undefined {
  return MODELS.find((m) => m.name === name);
}

const FALLBACK_COLORS = ['#FBBF24', '#FB923C', '#4ADE80', '#E879F9', '#38BDF8'];

export function modelColor(name: string, index = 0): string {
  return getModelInfo(name)?.color ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

export function modelShort(name: string): string {
  return getModelInfo(name)?.short ?? name.slice(0, 4).toUpperCase();
}

export function modelOrder(name: string): number {
  const i = MODELS.findIndex((m) => m.name === name);
  return i === -1 ? 999 : i;
}
