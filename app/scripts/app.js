'use strict';

angular
  .module('mapDemoApp', ['ngMaterial', 'leaflet-directive'])
  .config(function($mdThemingProvider) {
    $mdThemingProvider.theme('default')
      .primaryPalette('light-blue', {
        'default': '900'
      })
      .backgroundPalette('grey', {
        'default': '50'
      });
  })
  .filter('decimals', ['$filter', function($filter) {
    return function(input, decimals) {
      return $filter('number')(input, decimals);
    };
  }])
  .directive('marker', ['$compile', function($compile) {
    return {
      strict: 'E',
      link: function(scope, element) {
        var html = '<div style="margin:25%;">' +
          '<div class="dot"></div>' +
          '<div class="pulse"></div>' +
          '</div>';
        element.append($compile(html)(scope));
      }
    };
  }])
  .factory('GeoService', ['$http', function($http) {
    var appkey = 'pk.eyJ1IjoiaWJvcm92dHNvdmEiLCJhIjoiY2lvYnd5ejR6MDA0c3czbTVwOWx5Zmc1MCJ9.v1O7fqyBZOnRMsHbEZgwCQ';

    var config = {
      london: {
        lat: 42.3610,
        lng: -71.0587,
        zoom: 15
      },
      defaults: {
        tileLayer: 'http://api.mapbox.com/v4/mapbox.streets/{z}/{x}/{y}.png?access_token={token}',
        tileLayerOptions: {
          opacity: 0.9,
          detectRetina: true,
          reuseTiles: true,
          token: appkey
        },
        scrollWheelZoom: false
      },
      events: {
        markers: {
          enable: ['click', 'mousedown'],
          logic: 'emit'
        }
      }
    };

    return {
      getMapConfig: function() {
        return config;
      },
      retrieveAddressBy: function(latlng) {
        var url = 'http://api.mapbox.com/geocoding/v5/mapbox.places/' + latlng.lng + ',' + latlng.lat + '.json';

        return $http.get(url, {
          params: {
            types: 'address',
            access_token: appkey
          }
        });
      }
    };
  }])
  .controller('DemoAppCtrl', ['$scope', '$mdDialog', 'GeoService', function($scope, $mdDialog, GeoService) {
    $scope.config = GeoService.getMapConfig();
    $scope.markers = [];
    angular.extend($scope, $scope.config);

    $scope.$on('leafletDirectiveMap.click', function(event, args) {
      $scope.longHold = false;
      var leafEvent = args.leafletEvent;

      GeoService.retrieveAddressBy(leafEvent.latlng).success(function(resp) {
        $scope.markers.push({
          lat: leafEvent.latlng.lat,
          lng: leafEvent.latlng.lng,
          address: resp.features[0].place_name,
          draggable: true,
          icon: {
            html: '<div>' +
              '<div class="dot"></div>' +
              '<div class="pulse"></div>' +
              '</div>',
            type: 'div'
          }
        });
      });
    });

    $scope.$on('leafletDirectiveMarker.click', function(event, args) {
      $scope.longHold = false;

      $mdDialog.show({
          controller: function DialogController($scope, $mdDialog, location) {
            $scope.location = angular.copy(location);
            $scope.cancel = function() {
              $mdDialog.cancel();
            };
            $scope.ok = function() {
              $mdDialog.hide($scope.location);
            };
          },
          templateUrl: 'templates/location-dialog.tmpl.html',
          parent: angular.element(document.body),
          targetEvent: event.targetEvent,
          locals: {
            location: $scope.markers[args.modelName]
          }
        })
        .then(function(updated) {
          GeoService.retrieveAddressBy({
            lat: updated.lat,
            lng: updated.lng
          }).success(function(resp) {
            $scope.markers[args.modelName] = updated;
            $scope.markers[args.modelName].address = resp.features[0].place_name;
          });
        });
    });

    $scope.$on('leafletDirectiveMarker.mousedown', function(event, args) {
      clearTimeout($scope.downTimer);
      $scope.downTimer = setTimeout(function() {
        $scope.longHold = true;
        $scope.ev = {
          args: args.modelName,
          target: event.targetEvent
        };
      }, 500);
    });

    $scope.$on('leafletDirectiveMap.mousemove', function() {
      $scope.longHold = false;
    });

    $scope.$on('leafletDirectiveMap.mouseup', function() {
      if ($scope.longHold) {
        $scope.longHold = false;
        var confirm = $mdDialog.confirm()
          .title('Would you like to delete selected location?')
          .textContent('It will be deleted forever.')
          .targetEvent($scope.ev.target)
          .ok('Continue')
          .cancel('Cancel');

        $mdDialog.show(confirm).then(function() {
          $scope.markers.splice($scope.ev.args, 1);
        });
      }
    });

    $scope.$watch(function() {
      return angular.element(document.querySelector('.map-container'))[0].offsetHeight;
    }, function(newValue) {
      $scope.mapHeight = newValue;
    });

    $scope.reset = function() {
      $scope.markers = [];
    };
  }]);
