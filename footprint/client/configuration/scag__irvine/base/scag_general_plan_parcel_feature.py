# coding=utf-8
# UrbanFootprint-California (v1.0), Land Use Scenario Development and Modeling System.
#
# Copyright (C) 2012 Calthorpe Associates
#
# This program is free software: you can redistribute it and/or modify it under the terms of the
# GNU General Public License as published by the Free Software Foundation, version 3 of the License.
#
# This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
# without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
# See the GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License along with this program.
# If not, see <http://www.gnu.org/licenses/>.
#
# Contact: Joe DiStefano (joed@calthorpe.com), Calthorpe Associates.
# Firm contact: 2095 Rose Street Suite 201, Berkeley CA 94709.
# Phone: (510) 548-6800. Web: www.calthorpe.com
from django.contrib.gis.db import models
from footprint.main.models.geospatial.feature import Feature

__author__ = 'calthorpe_associates'


class ScagGeneralPlanParcelFeature(Feature):
    apn = models.CharField(max_length=100, null=True, blank=True)
    # TODO this seems to have been removed
    #land_use_definition = models.ForeignKey(ScagLandUseDefinition, null=True)
    scag_general_plan_code = models.IntegerField(null=True)
    general_plan_code = models.CharField(max_length=100, null=True, blank=True)
    zone_code = models.CharField(max_length=100, null=True, blank=True)
    comments = models.CharField(max_length=200, null=True, default=None)

    class Meta(object):
        abstract = True
        app_label = 'main'


class TemplateScagGeneralPlanParcelFeature(ScagGeneralPlanParcelFeature):
    """
        Template subclass so that south generates migrations that we can apply to the dynamically generated subclasses
    """

    class Meta(object):
        app_label = 'main'
        abstract = False
