// Smooth scrolling utility functions
export const smoothScrollToElement = (elementId: string, offset: number = 80) => {
  const element = document.getElementById(elementId.replace('#', ''));
  if (element) {
    const elementPosition = element.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - offset;

    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth'
    });
  }
};

export const smoothScrollToSection = (sectionId: string) => {
  // Remove # if present and add smooth scrolling
  const cleanId = sectionId.replace('#', '');
  const element = document.getElementById(cleanId);
  
  if (element) {
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
      inline: 'nearest'
    });
  } else {
    console.warn(`Element with id "${cleanId}" not found`);
  }
};

export const handleSmoothNavigation = (href: string, event?: React.MouseEvent) => {
  // Handle hash navigation with smooth scrolling
  if (href.startsWith('#')) {
    event?.preventDefault();
    smoothScrollToSection(href);
    return true;
  }
  return false;
};