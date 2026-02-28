import {
  getInvoiceNinjaCountryId,
  INVOICE_NINJA_SUPPORTED_ALPHA2,
  ALPHA2_TO_COUNTRY_ID,
} from './invoice-ninja-country-id.map';

describe('invoice-ninja-country-id.map', () => {
  describe('getInvoiceNinjaCountryId', () => {
    it('returns country_id for alpha-2 code (DE -> 276)', () => {
      expect(getInvoiceNinjaCountryId('DE')).toBe(276);
      expect(getInvoiceNinjaCountryId('de')).toBe(276);
    });

    it('returns country_id for alpha-3 code (DEU -> 276)', () => {
      expect(getInvoiceNinjaCountryId('DEU')).toBe(276);
      expect(getInvoiceNinjaCountryId('gbr')).toBe(826);
    });

    it('returns undefined for null, undefined, empty string', () => {
      expect(getInvoiceNinjaCountryId(null)).toBeUndefined();
      expect(getInvoiceNinjaCountryId(undefined)).toBeUndefined();
      expect(getInvoiceNinjaCountryId('')).toBeUndefined();
      expect(getInvoiceNinjaCountryId('   ')).toBeUndefined();
    });

    it('returns undefined for unsupported code', () => {
      expect(getInvoiceNinjaCountryId('XX')).toBeUndefined();
      expect(getInvoiceNinjaCountryId('XXX')).toBeUndefined();
    });

    it('returns correct id for US/USA (840)', () => {
      expect(getInvoiceNinjaCountryId('US')).toBe(840);
      expect(getInvoiceNinjaCountryId('USA')).toBe(840);
    });
  });

  describe('INVOICE_NINJA_SUPPORTED_ALPHA2', () => {
    it('contains all keys of ALPHA2_TO_COUNTRY_ID', () => {
      const fromMap = Object.keys(ALPHA2_TO_COUNTRY_ID).sort();
      expect(INVOICE_NINJA_SUPPORTED_ALPHA2).toEqual(fromMap);
    });

    it('includes common codes', () => {
      expect(INVOICE_NINJA_SUPPORTED_ALPHA2).toContain('DE');
      expect(INVOICE_NINJA_SUPPORTED_ALPHA2).toContain('GB');
      expect(INVOICE_NINJA_SUPPORTED_ALPHA2).toContain('US');
      expect(INVOICE_NINJA_SUPPORTED_ALPHA2).toContain('FR');
    });
  });
});
