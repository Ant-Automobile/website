// Phosphor (light) ikonları: yalnızca kullanılanlar satır içi SVG olarak eklenir.
import sunDim from '@phosphor-icons/core/assets/light/sun-dim-light.svg?raw';
import moon from '@phosphor-icons/core/assets/light/moon-light.svg?raw';
import arrowDownRight from '@phosphor-icons/core/assets/light/arrow-down-right-light.svg?raw';
import eye from '@phosphor-icons/core/assets/light/eye-light.svg?raw';
import cpu from '@phosphor-icons/core/assets/light/cpu-light.svg?raw';
import usersThree from '@phosphor-icons/core/assets/light/users-three-light.svg?raw';
import plugsConnected from '@phosphor-icons/core/assets/light/plugs-connected-light.svg?raw';
import paperPlaneTilt from '@phosphor-icons/core/assets/light/paper-plane-tilt-light.svg?raw';
import linkedinLogo from '@phosphor-icons/core/assets/light/linkedin-logo-light.svg?raw';
import instagramLogo from '@phosphor-icons/core/assets/light/instagram-logo-light.svg?raw';
import xLogo from '@phosphor-icons/core/assets/light/x-logo-light.svg?raw';
import arrowUpRight from '@phosphor-icons/core/assets/light/arrow-up-right-light.svg?raw';

export const icons = {
  'sun-dim': sunDim, moon, 'arrow-down-right': arrowDownRight, eye, cpu,
  'users-three': usersThree, 'plugs-connected': plugsConnected, 'paper-plane-tilt': paperPlaneTilt,
  'linkedin-logo': linkedinLogo, 'instagram-logo': instagramLogo, 'x-logo': xLogo, 'arrow-up-right': arrowUpRight,
};

export function setIcon(el, name) {
  el.innerHTML = icons[name] || '';
  el.dataset.icon = name;
}

export function hydrateIcons(root = document) {
  root.querySelectorAll('i.ph-light').forEach((el) => {
    const name = [...el.classList].find((c) => c.startsWith('ph-') && c !== 'ph-light')?.slice(3);
    if (name) setIcon(el, name);
  });
}
