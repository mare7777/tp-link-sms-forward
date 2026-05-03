import fs from 'fs'

function parseValue(value) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value !== '' && !Number.isNaN(Number(value))) return Number(value);
  return value;
}

function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    const sourceValue = source[key];
    const targetValue = target[key];

    if (
      sourceValue &&
      typeof sourceValue === 'object' &&
      !Array.isArray(sourceValue) &&
      targetValue &&
      typeof targetValue === 'object' &&
      !Array.isArray(targetValue)
    ) {
      deepMerge(targetValue, sourceValue);
      continue;
    }

    target[key] = sourceValue;
  }
  return target;
}

function setByPath(object, path, value) {
  const segments = path.split('.');
  let current = object;

  while (segments.length > 1) {
    const segment = segments.shift();
    if (!Object.hasOwn(current, segment) || typeof current[segment] !== 'object' || current[segment] === null) {
      current[segment] = {};
    }
    current = current[segment];
  }

  current[segments[0]] = value;
}

export function loadConfig(configFilePath = './config.json') {
  let config = {};

  try {
    const rawConfig = fs.readFileSync(configFilePath);
    config = JSON.parse(rawConfig);
  } catch (exception) {
    throw new Error('Config file ' + configFilePath + ' could not be read');
  }

  if (process.env.CONFIG_JSON) {
    try {
      const configFromEnv = JSON.parse(process.env.CONFIG_JSON);
      config = deepMerge(config, configFromEnv);
    } catch (exception) {
      throw new Error('CONFIG_JSON is not valid JSON');
    }
  }

  for (const [key, value] of Object.entries(process.env)) {
    if (!key.startsWith('CONFIG__')) {
      continue;
    }

    const path = key
      .replace(/^CONFIG__/, '')
      .toLowerCase()
      .split('__')
      .join('.');

    setByPath(config, path, parseValue(value));
  }

  return config;
}
