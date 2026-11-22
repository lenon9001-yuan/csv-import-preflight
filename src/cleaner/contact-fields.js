const countryAliases = new Map([
  ['MY', ['Malaysia']], ['SG', ['Singapore']], ['US', ['USA', 'United States', 'United States of America', 'U.S.']],
  ['GB', ['UK', 'United Kingdom', 'U.K.']], ['CA', ['Canada']], ['AU', ['Australia']],
  ['NZ', ['New Zealand']], ['IN', ['India']], ['CN', ['China']], ['JP', ['Japan']],
  ['ID', ['Indonesia']], ['TH', ['Thailand']], ['VN', ['Vietnam', 'Viet Nam']],
  ['PH', ['Philippines']], ['FR', ['France']], ['DE', ['Germany']], ['NL', ['Netherlands']],
  ['IE', ['Ireland']], ['ES', ['Spain']], ['IT', ['Italy']], ['BR', ['Brazil']],
].flatMap(([code, aliases]) => [code, ...aliases].map((alias) => [alias.toLowerCase(), code])));

const tidySpaces = (value) => value.replace(/[ \t\u00A0]+/g, ' ');

export const contactRules = {
  name: {
    reason: 'Tidied name capitalization and spacing',
    normalize(value) {
      return tidySpaces(value).split(' ').map((part) => {
        if (!/^[a-z]{3,}$/i.test(part)) return part;
        if (part !== part.toUpperCase() && part !== part.toLowerCase()) return part;
        return part[0].toUpperCase() + part.slice(1).toLowerCase();
      }).join(' ');
    },
  },
  company: { reason: 'Tidied company spacing', normalize: tidySpaces },
  country: {
    reason: 'Standardized country code',
    normalize: (value) => countryAliases.get(tidySpaces(value).toLowerCase()) ?? value,
  },
  address: { reason: 'Tidied address spacing', normalize: tidySpaces },
};
