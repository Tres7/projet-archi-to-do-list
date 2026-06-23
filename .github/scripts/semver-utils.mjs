function isDigit(value) {
  return value >= '0' && value <= '9';
}

function isAsciiLetter(value) {
  return (value >= 'A' && value <= 'Z') || (value >= 'a' && value <= 'z');
}

function isIdentifierCharacter(value) {
  return isDigit(value) || isAsciiLetter(value) || value === '-';
}

function isNumericIdentifier(value) {
  if (value.length === 0) {
    return false;
  }

  for (const character of value) {
    if (!isDigit(character)) {
      return false;
    }
  }

  return true;
}

function compareNumericStrings(left, right) {
  if (left.length !== right.length) {
    return left.length - right.length;
  }

  return left < right ? -1 : left > right ? 1 : 0;
}

function parseIdentifiers(value, fail, { allowNumericLeadingZeros }) {
  const identifiers = value.split('.');

  for (const identifier of identifiers) {
    if (identifier.length === 0) {
      fail();
    }

    for (const character of identifier) {
      if (!isIdentifierCharacter(character)) {
        fail();
      }
    }

    if (!allowNumericLeadingZeros
      && identifier.length > 1
      && identifier[0] === '0'
      && isNumericIdentifier(identifier)) {
      fail();
    }
  }

  return identifiers;
}

function parseCoreIdentifier(value, fail) {
  if (!isNumericIdentifier(value)) {
    fail();
  }

  if (value.length > 1 && value[0] === '0') {
    fail();
  }

  return value;
}

export function parseSemver(version, label = 'SemVer') {
  if (typeof version !== 'string') {
    throw new Error(`${label} version must be a string.`);
  }

  function fail() {
    throw new Error(`${label} version '${version}' is not valid SemVer.`);
  }

  const buildSeparator = version.indexOf('+');
  let withoutBuild = version;

  if (buildSeparator !== -1) {
    if (version.indexOf('+', buildSeparator + 1) !== -1) {
      fail();
    }

    withoutBuild = version.slice(0, buildSeparator);
    parseIdentifiers(version.slice(buildSeparator + 1), fail, { allowNumericLeadingZeros: true });
  }

  const prereleaseSeparator = withoutBuild.indexOf('-');
  const core = prereleaseSeparator === -1
    ? withoutBuild
    : withoutBuild.slice(0, prereleaseSeparator);
  const prerelease = prereleaseSeparator === -1
    ? []
    : parseIdentifiers(withoutBuild.slice(prereleaseSeparator + 1), fail, { allowNumericLeadingZeros: false });
  const coreIdentifiers = core.split('.');

  if (coreIdentifiers.length !== 3) {
    fail();
  }

  return {
    original: version,
    major: parseCoreIdentifier(coreIdentifiers[0], fail),
    minor: parseCoreIdentifier(coreIdentifiers[1], fail),
    patch: parseCoreIdentifier(coreIdentifiers[2], fail),
    prerelease,
  };
}

export function isValidSemver(version) {
  try {
    parseSemver(version);
    return true;
  } catch {
    return false;
  }
}

function compareIdentifiers(left, right) {
  const leftNumeric = isNumericIdentifier(left);
  const rightNumeric = isNumericIdentifier(right);

  if (leftNumeric && rightNumeric) {
    return compareNumericStrings(left, right);
  }

  if (leftNumeric !== rightNumeric) {
    return leftNumeric ? -1 : 1;
  }

  return left < right ? -1 : left > right ? 1 : 0;
}

export function compareSemver(left, right) {
  for (const key of ['major', 'minor', 'patch']) {
    const compared = compareNumericStrings(left[key], right[key]);
    if (compared !== 0) {
      return compared;
    }
  }

  if (left.prerelease.length === 0 && right.prerelease.length === 0) {
    return 0;
  }

  if (left.prerelease.length === 0) {
    return 1;
  }

  if (right.prerelease.length === 0) {
    return -1;
  }

  const length = Math.max(left.prerelease.length, right.prerelease.length);
  for (let index = 0; index < length; index += 1) {
    if (left.prerelease[index] === undefined) {
      return -1;
    }

    if (right.prerelease[index] === undefined) {
      return 1;
    }

    const compared = compareIdentifiers(left.prerelease[index], right.prerelease[index]);
    if (compared !== 0) {
      return compared;
    }
  }

  return 0;
}
