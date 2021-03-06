/*
 * UrbanFootprint-California (v1.0), Land Use Scenario Development and Modeling System.
 * 
 * Copyright (C) 2012 Calthorpe Associates
 * 
 * This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, version 3 of the License.
 * 
 * This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License along with this program.  If not, see <http://www.gnu.org/licenses/>.
 * 
 * Contact: Joe DiStefano (joed@calthorpe.com), Calthorpe Associates. Firm contact: 2095 Rose Street Suite 201, Berkeley CA 94709. Phone: (510) 548-6800. Web: www.calthorpe.com
 */

Footprint.Key = {
    key:SC.Record.attr(String),
    nameObserver: function(key, value) {
        // Keys are bound to a slugified name when new
        // For now only update the key if the record is new.
        // Updating the key on existing records is problematic, since it's a sort of id. Although this should work someday
        if (this.get('status') === SC.Record.READY_NEW) {
            key = '%@%@'.fmt(this.get('keyPrefix') || '', (this.get('name') || '').dasherize().replace(/-/g, '_'));
            this.setIfChanged('key', key.substr(0,50));
        }
    }.observes('.name', '.status')
};


