import { catalogDrinkName } from '../catalogNames';

describe('catalogDrinkName', () => {
  it('translates a known catalog entry whose name mixes in an English serving-size word', () => {
    const drink = { id: 'beer-lager-half', isCustom: false, name: 'Lager (small)' };
    expect(catalogDrinkName('en', drink)).toBe('Lager (small)');
    expect(catalogDrinkName('fr', drink)).toBe('Lager (petit)');
    expect(catalogDrinkName('ar', drink)).toBe('لايغر (صغير)');
  });

  it('falls back to the drink\'s own name for entries with no override', () => {
    const drink = { id: 'spirit-absinthe', isCustom: false, name: 'Absinthe' };
    expect(catalogDrinkName('fr', drink)).toBe('Absinthe');
    expect(catalogDrinkName('zh', drink)).toBe('Absinthe');
  });

  it('never overrides a custom (user-created) drink, even if its id happens to collide', () => {
    const drink = { id: 'beer-lager-half', isCustom: true, name: 'My homemade panaché' };
    expect(catalogDrinkName('fr', drink)).toBe('My homemade panaché');
  });
});
