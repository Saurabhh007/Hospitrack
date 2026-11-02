/**
 * Hospitrack — Synchronized Horizontal Scroll & Timeline Progress Engine
 * 
 * Provides:
 * - Dynamic scroll progress line synchronization:
 *     scrollPercentage = (scrollLeft / (scrollWidth - clientWidth)) * 100
 * - Edge boundary detection with smooth floating navigation chevron buttons (< and >)
 * - Subtle gradient edge fade masks
 * - Sticky identifier columns for wide clinical data tables
 * - MutationObserver integration for live dashboard tab transitions
 */

(function (window, document) {
  'use strict';

  const hospitrackScrollSync = {
    activeTracks: new WeakMap(),

    /**
     * Calculates the horizontal scroll percentage (0 - 100)
     */
    calculateScrollPercentage: function (el) {
      if (!el) return 0;
      const scrollLeft = el.scrollLeft || 0;
      const scrollWidth = el.scrollWidth || 0;
      const clientWidth = el.clientWidth || 0;
      const maxScroll = scrollWidth - clientWidth;

      if (maxScroll <= 2) return 100;
      return Math.min(100, Math.max(0, (scrollLeft / maxScroll) * 100));
    },

    /**
     * Initializes a single horizontal scroll container with progress line and navigation chevrons
     */
    initHorizontalScroll: function (el, options) {
      if (!el || typeof el !== 'object' || !(el instanceof HTMLElement)) return null;

      // Avoid duplicate initialization on the same element
      if (this.activeTracks.has(el)) {
        this.updateTrack(el);
        return this.activeTracks.get(el);
      }

      const opts = Object.assign({
        showProgressLine: true,
        showNavigationButtons: true,
        progressLinePosition: 'bottom', // 'top' | 'bottom'
        scrollStep: 240,
        fadeMask: true,
        snapAlign: 'start',
        customScrollbar: false,
        onScrollChange: null
      }, options || {});

      // Apply base utility classes
      el.classList.add(opts.customScrollbar ? 'custom-horizontal-scrollbar' : 'no-scrollbar');
      el.style.scrollBehavior = 'smooth';
      el.style.overflowX = 'auto';

      if (opts.snapAlign === 'start') {
        el.classList.add('scroll-container');
      }

      // Check if wrapper already exists
      let wrapper = el.parentElement;
      if (!wrapper || !wrapper.classList.contains('scroll-track-wrapper')) {
        wrapper = document.createElement('div');
        wrapper.className = 'scroll-track-wrapper relative w-full max-w-full min-w-0';
        el.parentNode.insertBefore(wrapper, el);
        wrapper.appendChild(el);
      }

      // Create Progress Line Track if enabled
      let progressTrack = null;
      let progressBar = null;

      if (opts.showProgressLine) {
        progressTrack = document.createElement('div');
        progressTrack.className = 'scroll-progress-track relative w-full h-[3px] bg-slate-200/80 rounded-full overflow-hidden ' +
          (opts.progressLinePosition === 'top' ? 'mb-2' : 'mt-2');
        progressTrack.setAttribute('role', 'progressbar');
        progressTrack.setAttribute('aria-valuemin', '0');
        progressTrack.setAttribute('aria-valuemax', '100');
        progressTrack.setAttribute('aria-valuenow', '0');

        progressBar = document.createElement('div');
        progressBar.className = 'scroll-progress-bar absolute left-0 top-0 bottom-0 bg-teal-600 rounded-full transition-all duration-150 ease-out';
        progressBar.style.width = '0%';

        progressTrack.appendChild(progressBar);

        if (opts.progressLinePosition === 'top') {
          wrapper.insertBefore(progressTrack, el);
        } else {
          wrapper.appendChild(progressTrack);
        }
      }

      // Create Navigation Buttons (< and >) if enabled
      let btnLeft = null;
      let btnRight = null;

      if (opts.showNavigationButtons) {
        btnLeft = document.createElement('button');
        btnLeft.type = 'button';
        btnLeft.className = 'scroll-nav-btn scroll-nav-left absolute left-1 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/95 border border-slate-200/90 shadow-md flex items-center justify-center text-slate-700 transition-all duration-200 hover:bg-slate-50 hover:text-teal-600 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-teal-500/20 active:scale-95 disabled:opacity-0 disabled:pointer-events-none disabled:scale-90';
        btnLeft.innerHTML = '<svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>';
        btnLeft.setAttribute('aria-label', 'Scroll left');

        btnRight = document.createElement('button');
        btnRight.type = 'button';
        btnRight.className = 'scroll-nav-btn scroll-nav-right absolute right-1 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/95 border border-slate-200/90 shadow-md flex items-center justify-center text-slate-700 transition-all duration-200 hover:bg-slate-50 hover:text-teal-600 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-teal-500/20 active:scale-95 disabled:opacity-0 disabled:pointer-events-none disabled:scale-90';
        btnRight.innerHTML = '<svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>';
        btnRight.setAttribute('aria-label', 'Scroll right');

        wrapper.appendChild(btnLeft);
        wrapper.appendChild(btnRight);

        btnLeft.addEventListener('click', function (e) {
          e.preventDefault();
          el.scrollBy({ left: -opts.scrollStep, behavior: 'smooth' });
        });

        btnRight.addEventListener('click', function (e) {
          e.preventDefault();
          el.scrollBy({ left: opts.scrollStep, behavior: 'smooth' });
        });
      }

      // Drag to scroll interaction
      let isDown = false;
      let startX = 0;
      let scrollStart = 0;

      el.addEventListener('mousedown', function (e) {
        if (e.target.closest('button') || e.target.closest('a') || e.target.closest('input')) return;
        isDown = true;
        startX = e.pageX - el.offsetLeft;
        scrollStart = el.scrollLeft;
        el.style.cursor = 'grabbing';
        el.style.userSelect = 'none';
      });

      el.addEventListener('mousemove', function (e) {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - el.offsetLeft;
        const walk = (x - startX) * 1.5;
        el.scrollLeft = scrollStart - walk;
      });

      const stopDrag = function () {
        isDown = false;
        el.style.cursor = '';
        el.style.removeProperty('user-select');
      };

      el.addEventListener('mouseup', stopDrag);
      el.addEventListener('mouseleave', stopDrag);

      // State updater
      const trackInstance = {
        el: el,
        wrapper: wrapper,
        progressTrack: progressTrack,
        progressBar: progressBar,
        btnLeft: btnLeft,
        btnRight: btnRight,
        options: opts,
        update: function () {
          const scrollLeft = el.scrollLeft || 0;
          const scrollWidth = el.scrollWidth || 0;
          const clientWidth = el.clientWidth || 0;
          const maxScroll = Math.max(0, scrollWidth - clientWidth);

          const isOverflowing = maxScroll > 2;

          // Toggle visibility of buttons and progress bar based on overflow
          if (progressTrack) {
            progressTrack.style.display = isOverflowing ? 'block' : 'none';
          }

          if (isOverflowing) {
            const percentage = Math.min(100, Math.max(0, (scrollLeft / maxScroll) * 100));
            if (progressBar) {
              progressBar.style.width = percentage + '%';
              progressTrack.setAttribute('aria-valuenow', Math.round(percentage).toString());
            }

            if (btnLeft) {
              btnLeft.disabled = scrollLeft <= 2;
              btnLeft.style.display = 'flex';
            }
            if (btnRight) {
              btnRight.disabled = scrollLeft >= maxScroll - 2;
              btnRight.style.display = 'flex';
            }

            if (opts.fadeMask) {
              el.classList.add('scroll-fade-mask');
            }

            if (typeof opts.onScrollChange === 'function') {
              opts.onScrollChange(percentage, scrollLeft);
            }
          } else {
            if (progressBar) progressBar.style.width = '100%';
            if (btnLeft) btnLeft.style.display = 'none';
            if (btnRight) btnRight.style.display = 'none';
            if (opts.fadeMask) el.classList.remove('scroll-fade-mask');
            if (typeof opts.onScrollChange === 'function') {
              opts.onScrollChange(100, 0);
            }
          }
        }
      };

      // Listen for scrolls
      el.addEventListener('scroll', function () {
        requestAnimationFrame(function () {
          trackInstance.update();
        });
      }, { passive: true });

      // ResizeObserver
      if (typeof ResizeObserver !== 'undefined') {
        const ro = new ResizeObserver(function () {
          trackInstance.update();
        });
        ro.observe(el);
        if (el.firstElementChild) {
          ro.observe(el.firstElementChild);
        }
      }

      this.activeTracks.set(el, trackInstance);
      trackInstance.update();
      return trackInstance;
    },

    updateTrack: function (el) {
      const instance = this.activeTracks.get(el);
      if (instance && typeof instance.update === 'function') {
        instance.update();
      }
    },

    /**
     * Initializes sticky pinned column styling for wide clinical data tables
     */
    initTableStickyColumns: function (tableEl) {
      if (!tableEl || !(tableEl instanceof HTMLElement)) return;

      // Find first column headers and cells
      const ths = tableEl.querySelectorAll('thead th:first-child');
      ths.forEach(function (th) {
        th.classList.add('sticky-column-left');
      });

      const tds = tableEl.querySelectorAll('tbody td:first-child');
      tds.forEach(function (td) {
        td.classList.add('sticky-column-left');
      });
    },

    /**
     * Scans the DOM and enhances all timeline steppers, facility switchers, category strips, and tables
     */
    initAllScrollTracks: function (root) {
      const scope = root && root instanceof HTMLElement ? root : document;

      // 1. Milestone Steppers (Care Journey / Discharge Clearance)
      const steppers = scope.querySelectorAll('.milestone-stepper-ribbon:not(.scroll-synced)');
      steppers.forEach(function (st) {
        st.classList.add('scroll-synced');
        hospitrackScrollSync.initHorizontalScroll(st, {
          showProgressLine: true,
          progressLinePosition: 'bottom',
          scrollStep: 200,
          fadeMask: true
        });
      });

      // 2. Facility Switcher & Filter Pills
      const facilityStrips = scope.querySelectorAll('.facility-pill-strip:not(.scroll-synced), .clinical-category-strip:not(.scroll-synced)');
      facilityStrips.forEach(function (fs) {
        fs.classList.add('scroll-synced');
        hospitrackScrollSync.initHorizontalScroll(fs, {
          showProgressLine: false,
          showNavigationButtons: true,
          scrollStep: 180,
          fadeMask: true
        });
      });

      // 3. Sub-pill Navigation Bars
      const pillNavs = scope.querySelectorAll('.sub-pill-tabs-nav:not(.scroll-synced)');
      pillNavs.forEach(function (pn) {
        pn.classList.add('scroll-synced');
        hospitrackScrollSync.initHorizontalScroll(pn, {
          showProgressLine: true,
          progressLinePosition: 'bottom',
          scrollStep: 160,
          fadeMask: true
        });
      });

      // 4. Wide Clinical Data Tables (Sticky first column + custom scrollbar)
      const tables = scope.querySelectorAll('.table-responsive table, .table-container-clean table, .table-scroll-container table, .data-table, .inpatient-table');
      tables.forEach(function (tbl) {
        hospitrackScrollSync.initTableStickyColumns(tbl);
      });

      const tableContainers = scope.querySelectorAll('.table-container-clean:not(.scroll-synced), .table-responsive:not(.scroll-synced), .table-scroll-container:not(.scroll-synced)');
      tableContainers.forEach(function (tc) {
        tc.classList.add('scroll-synced');
        tc.classList.add('custom-horizontal-scrollbar');
        tc.style.overflowX = 'auto';
        tc.style.maxWidth = '100%';
        hospitrackScrollSync.initHorizontalScroll(tc, {
          showProgressLine: true,
          progressLinePosition: 'bottom',
          scrollStep: 280,
          fadeMask: false,
          customScrollbar: true
        });
      });
    }
  };

  // Expose to window
  window.hospitrackScrollSync = hospitrackScrollSync;
  window.initHorizontalScrollTrack = function (el, options) {
    return hospitrackScrollSync.initHorizontalScroll(el, options);
  };

  // Auto-initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      hospitrackScrollSync.initAllScrollTracks();
    });
  } else {
    hospitrackScrollSync.initAllScrollTracks();
  }

  // MutationObserver on #mainContentArea to auto-sync on dashboard tab changes
  if (typeof MutationObserver !== 'undefined') {
    const observer = new MutationObserver(function (mutations) {
      let shouldScan = false;
      for (let i = 0; i < mutations.length; i++) {
        if (mutations[i].addedNodes && mutations[i].addedNodes.length > 0) {
          shouldScan = true;
          break;
        }
      }
      if (shouldScan) {
        requestAnimationFrame(function () {
          hospitrackScrollSync.initAllScrollTracks();
        });
      }
    });

    const initObserver = function () {
      const target = document.getElementById('mainContentArea') || document.body;
      if (target) {
        observer.observe(target, { childList: true, subtree: true });
      }
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initObserver);
    } else {
      initObserver();
    }
  }

})(typeof window !== 'undefined' ? window : this, typeof document !== 'undefined' ? document : {});

