const isoDatePattern = /^(\d{4})-(\d{2})-(\d{2})$/;
const isoDateTimeWithZonePattern =
  /^(\d{4})-(\d{2})-(\d{2})T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,9})?)?(?:Z|[+-](?:0\d|1[0-4]):[0-5]\d)$/;

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
