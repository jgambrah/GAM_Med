/**
 * Verifies if a donor's blood group is compatible with a recipient's blood group.
 * @param donor - The blood group of the donor pint (e.g. 'O-', 'A+')
 * @param recipient - The blood group of the patient (e.g. 'AB+', 'O-')
 */
export function areBloodGroupsCompatible(donor: string, recipient: string): boolean {
  const normalizedDonor = donor.trim().toUpperCase();
  const normalizedRecipient = recipient.trim().toUpperCase();

  const compatibilityMap: Record<string, string[]> = {
    'O-': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'], // O- is universal donor
    'O+': ['O+', 'A+', 'B+', 'AB+'],
    'A-': ['A-', 'A+', 'AB-', 'AB+'],
    'A+': ['A+', 'AB+'],
    'B-': ['B-', 'B+', 'AB-', 'AB+'],
    'B+': ['B+', 'AB+'],
    'AB-': ['AB-', 'AB+'],
    'AB+': ['AB+'], // AB+ can only donate to AB+
  };

  return compatibilityMap[normalizedDonor]?.includes(normalizedRecipient) || false;
}

/**
 * Returns a list of compatible donor blood groups for a given recipient.
 */
export function getCompatibleDonors(recipient: string): string[] {
  const normalizedRecipient = recipient.trim().toUpperCase();
  const allGroups = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];
  return allGroups.filter(donor => areBloodGroupsCompatible(donor, normalizedRecipient));
}
