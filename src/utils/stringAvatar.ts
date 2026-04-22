import { stringToColor } from './stringToColor';

/**
 * Creates avatar props with background color and initials based on a name
 * @description Generates a background color based on the name and extracts initials
 * from the first and last name. Used for creating consistent avatars for users.
 * @param {string} name - User's full name (first and last name)
 * @returns {Record<string, unknown>} Props object with sx styles and children (initials)
 */
export function stringAvatar(name: string): Record<string, unknown> {
  return {
    sx: {
      backgroundColor: stringToColor(name),
    },
    children:
      name.toUpperCase().split(' ').length > 1
        ? `${name.toUpperCase().split(' ')[0][0]}${name.toUpperCase().split(' ')[1][0]}`
        : `${name.toUpperCase().split(' ')[0][0]}`,
  };
}
