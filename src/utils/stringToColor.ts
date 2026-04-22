/**
 * Converts a string to a deterministic hex color
 * @description Generates a consistent color based on the input string by hashing its characters.
 * Useful for creating unique but consistent colors for entities like avatars based on user names.
 * @param {string} string - Input string to convert to color
 * @returns {string} Hex color code starting with '#'
 */
export function stringToColor(string: string): string {
  let hash = 0;
  let index;

  for (index = 0; index < string.length; index += 1) {
    hash = string.charCodeAt(index) + ((hash << 5) - hash);
  }

  let color = '#';

  for (index = 0; index < 3; index += 1) {
    const value = (hash >> (index * 8)) & 0xff;
    color += `00${value.toString(16)}`.slice(-2);
  }
  return color;
}
