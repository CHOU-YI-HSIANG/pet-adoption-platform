// Helper to normalize pet photo field to a usable URL string
export function getPetPhotoUrl(pet) {
  if (!pet) return '/placeholder-pet.jpg';

  // 1) virtual primaryPhoto (object)
  if (pet.primaryPhoto && typeof pet.primaryPhoto === 'object') {
    if (pet.primaryPhoto.url) return pet.primaryPhoto.url;
    if (pet.primaryPhoto.filename) return `/uploads/pets/${pet.primaryPhoto.filename}`;
  }

  // 2) photos array
  if (Array.isArray(pet.photos) && pet.photos.length > 0) {
    const first = pet.photos[0];
    if (!first) return '/placeholder-pet.jpg';
    if (typeof first === 'string') return first;
    if (first.url) return first.url;
    if (first.filename) return `/uploads/pets/${first.filename}`;
  }

  // 3) legacy images field (array of urls)
  if (Array.isArray(pet.images) && pet.images.length > 0) {
    const img = pet.images[0];
    if (typeof img === 'string') return img;
  }

  // 4) direct photo url field
  if (pet.photo && typeof pet.photo === 'string') return pet.photo;

  return '/placeholder-pet.jpg';
}
