const isoDatePattern = /^(\d{4})-(\d{2})-(\d{2})$/;
const isoDateTimeWithZonePattern =
  /^(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:\d{2})$/;

export function parseDeterministicIsoDate(value: string): number | undefined {
  const dateMatch = isoDatePattern.exec(value);

  if (dateMatch) {
    return parseIsoDateOnly(dateMatch);
  }

  const dateTimeMatch = isoDateTimeWithZonePattern.exec(value);

  if (!dateTimeMatch || !isValidDateParts(dateTimeMatch)) {
    return undefined;
  }

  const timestamp = Date.parse(value);

  return Number.isNaN(timestamp) ? undefined : timestamp;
}

function parseIsoDateOnly(match: RegExpExecArray): number | undefined {
  if (!isValidDateParts(match)) {
    return undefined;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  return Date.UTC(year, month - 1, day);
}

function isValidDateParts(match: RegExpExecArray): boolean {
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const timestamp = Date.UTC(year, month - 1, day);
  const date = new Date(timestamp);

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}
