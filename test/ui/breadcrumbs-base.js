'use strict';

function describeBreadcrumbs(context) {
  describe('Breadcrumbs', function() {
    let presence = context.pageName.toLowerCase() !== 'about';
    let names = ['Target Folder', 'Selection', 'Confirmation', 'Account', 'Download & Install', 'Get Started'];
    let breadcrumbs;

    beforeAll(function() {
      breadcrumbs = element(By.className('breadcrumbs'));
    });

    it('should appear on all but the login page', function() {
      if (!presence) {
        expect(breadcrumbs.isPresent()).toBe(false);
      } else {
        expect(breadcrumbs.isDisplayed()).toBe(true);
      }
    });

    if (presence) {
      it('should display an entry with correct name for each affected page', function() {
        breadcrumbs.all(By.tagName('li')).then(function (items) {
          expect(items.length).toEqual(names.length);

          for (let i = 0; i < items.length; i++) {
            expect(items[i].getText()).toEqual(names[i]);
          }
        });
      });

      it('should set the last page as final', function() {
        let lastItem = breadcrumbs.element(By.className('end'));
        expect(lastItem.getText()).toEqual(names[names.length -1]);
      });

      it('should activate the current entry', function() {
        breadcrumbs.all(By.className('active')).then(function (activeItems) {
          expect(activeItems.length).toEqual(1);
          expect(activeItems[0].getText()).toEqual(context.pageName);
        });
      });
    }
  });
}

module.exports.describeBreadcrumbs = describeBreadcrumbs;
