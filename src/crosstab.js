var VAL_KEY = '@@@@',
    POS_KEY = '!@!@'

ngCubes.directive('cubesCrosstab', ['$rootScope', '$http', function($rootScope, $http) {
  return {
  restrict: 'EA',
  require: '^cubes',
  scope: {
    drilldown: '='
  },
  templateUrl: 'angular-cubes-templates/crosstab.html',
  link: function(scope, element, attrs, cubesCtrl) {
    scope.queryLoaded = false;
    scope.columns = [];
    scope.rows = [];
    scope.table = [];

    var query = function(model, state) {
      state.rows = asArray(state.rows);
      state.columns = asArray(state.columns);
      state.aggregates = asArray(state.aggregates);
      // TODO: handle a case in which both sets contain the same
      // ref.

      var q = cubesCtrl.getQuery();
      q.aggregates = q.aggregates.concat(state.aggregates);
      if (!q.aggregates.length) {
        q.aggregates = defaultAggregates(model);
      }
      q.drilldown = q.drilldown.concat(state.rows);
      q.drilldown = q.drilldown.concat(state.columns);
      q.page = 0;
      q.pagesize = q.pagesize * 10000;

      q.order = asArray(q.order);
      var drilldowns = state.rows.concat(state.columns),
          refs = drilldowns.concat(q.aggregates);
      for (var i in drilldowns) {
        var dd = drilldowns[i];
        if (!cubesCtrl.getSort(dd).direction) {
          if (q.order.indexOf(dd) == -1) {
            q.order.push({ref: dd});
          }  
        }
      }
      var order = [];
      for (var i in q.order) {
        var o = q.order[i];
        if (refs.indexOf(o.ref) != -1) {
          order.push(o);
        }
      }
      q.order = order;

      var dfd = $http.get(cubesCtrl.getApiUrl('aggregate'),
                          cubesCtrl.queryParams(q));
      dfd.then(function(res) {
        queryResult(res.data, q, model, state);
      });
    };

    var queryResult = function(data, q, model, state) {
      state.rows = asArray(state.rows);
      state.columns = asArray(state.columns);

      var aggregates = model.aggregates.filter(function(agg) {
        return data.aggregates.indexOf(agg.ref) != -1;
      });

      // following code inspired by: 
      // https://github.com/DataBrewery/cubes/blob/master/cubes/formatters.py#L218
      var matrix = {}, table = [],
          row_headers = [], column_headers = [],
          row_keys = [], column_keys = [];

      for (var i in data.cells) {
        var pickValue = function(k) { return cell[k]; },
            pickRefs = function(k) { return cell[model.refKeys[k]] + cell[k]; };

        var cell = data.cells[i],
            row_values = state.rows.map(pickValue),
            row_set = state.rows.map(pickRefs).join(VAL_KEY),
            all_column_values = state.columns.map(pickValue),
            all_column_set = state.columns.map(pickRefs);

        for (var k in aggregates) {
          var agg = aggregates[k],
              label = agg.label || agg.name,
              column_values = all_column_values.concat([label]);
              column_set = all_column_set.concat([label]).join(VAL_KEY)

          if (row_keys.indexOf(row_set) == -1) {
            row_keys.push(row_set);
            row_values.key = row_set;
            row_headers.push(row_values);
          }

          if (column_keys.indexOf(column_set) == -1) {
            column_keys.push(column_set);
            column_headers.push(column_values);
          }

          var key = [row_set, column_set].join(POS_KEY);
          matrix[key] = cell[agg.name];
        }
      }

      for (var i in row_keys) {
        var row_key = row_keys[i];
        var row = [];
        for (var j in column_keys) {
          var column_key = column_keys[j];
          var key = [row_key, column_key].join(POS_KEY);
          row.push(matrix[key] || data.aggregates.map(function(a) { return undefined; }));
        }
        table.push(row);
      }

      scope.rows = row_headers;
      scope.columns = column_headers;
      scope.table = table;
      scope.queryLoaded = true;
    };


    $rootScope.$on(cubesCtrl.modelUpdate, function(event, model, state) {
      query(model, state);
    });

    var defaultAggregates = function(model) {
      var aggs = [];
      for (var i in model.aggregates) {
        var agg = model.aggregates[i];
        aggs.push(agg.ref);
      }
      return aggs;
    };

    // console.log('crosstab init');
    cubesCtrl.init({
      columns: {
        label: 'Columns',
        addLabel: 'add column',
        types: ['attributes'],
        defaults: [],
        sortId: 0,
        multiple: true
      },
      rows: {
        label: 'Rows',
        addLabel: 'add row',
        types: ['attributes'],
        defaults: [],
        sortId: 1,
        multiple: true
      },
      aggregates: {
        label: 'Values',
        addLabel: 'add value',
        types: ['aggregates'],
        defaults: defaultAggregates,
        sortId: 2,
        multiple: true
      },

    });
  }
  };
}]);

