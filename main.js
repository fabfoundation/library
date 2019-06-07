var eventHub = new Vue();

Vue.component("search-box", {
  template: "#searchbox-template",
  data() {
    return {
      searchText: "",
      region: "",
      loading: false,
      error: false,
      message: null,
      regions: []
    };
  },
  mounted() {
    const vm = this;
    vm.loading = true;
    this.$http
      .get("https://forms.fabfoundation.org/api/v1/region")
      .then(function(res) {
        vm.regions = [{ id: -1, slug: "", name: "Any" }, ...res.data.objects];
        vm.loading = false;
      })
      .catch(function(err) {
        vm.loading = false;
        vm.error = true;
      });
  },
  methods: {
    submitForm(e) {
      e.preventDefault();
      vm = this;
      console.log(vm.searchText);
      vm.message = null;
      if (vm.searchText.length >= 3) {
        this.$emit("search", {
          text: vm.searchText,
          region: this.regions.filter(function(el) {
            return el.slug == vm.region;
          })[0]
        });
      } else {
        vm.message = "Please enter at least 3 characters";
      }
    }
  }
});

Vue.component("topic-item", {
  template: "#topic-item-template",
  props: ["topic"]
});

Vue.component("topic-list", {
  template: "#topic-list-template",
  props: ["topics"],
  data() {
    return {};
  },
  methods: {
    selectTopic(topic) {
      console.log("topic selected");
      this.$emit("topic", topic);
    }
  }
});

Vue.component("search-results-item", {
  template: "#search-results-item",
  props: ["item"],
  methods: {
    kindLabel(kind) {
      KIND_CHOICES = {
        PAPER: "Scientific Paper",
        WEB: "Web Article",
        WEBSITE: "Website",
        PRINT: "Print Article",
        BOOK: "Book",
        OTHER: "Other"
      };
      return KIND_CHOICES[kind];
    }
  }
});

Vue.component("search-results-header", {
  template: "#search-results-header",
  props: ["title"]
});

Vue.component("search-filter", {
  template: "#search-filter-template",
  props: ["count", "keywords", "reset", "loading"],
  methods: {}
});

Vue.component("search-results", {
  template: "#search-results",
  props: ["searchResults", "error"],
  data() {
    return {};
  }
  // methods: {
  //   changeOrder({ sort_dir, sort_by }) {
  //     this.$emit("changeOrder", { sort_dir, sort_by });
  //   }
  // }
});

Vue.component("sortbox", {
  template: "#sortbox-template",
  props: ["count", "by", "dir"],
  data() {
    return {
      sort_by: this.by,
      sort_dir: this.dir
    };
  },
  watch: {
    sort_by: function(val) {
      // console.log("Sort by " + val);
      this.$nextTick(function(vm) {
        eventHub.$emit("changeOrder", {
          sort_dir: this.sort_dir,
          sort_by: val
        });
      });
    },
    sort_dir: function(val) {
      const vm = this;
      // console.log("Sort dir " + val);
      this.$nextTick(function(vm) {
        eventHub.$emit("changeOrder", {
          sort_dir: val,
          sort_by: this.sort_by
        });
      });
    }
  }
});

var app = new Vue({
  el: "#app",
  template: "#app-template",
  data() {
    return {
      currentTopic: null,
      topics: [],
      loadingTopics: true,
      searchResults: [],
      loading: false,
      error: false,
      keywords: null,
      region: null,
      sort_by: "pub_date",
      sort_dir: "-"
    };
  },
  computed: {
    hasSearchCriteria() {
      return this.keywords != null || this.currentTopic != null;
    },
    searchCriteria() {
      return (
        (this.keywords &&
          "Contains: " + this.keywords + " Region: " + this.region.name) ||
        "Topic: " + this.currentTopic.title
      );
    },
    showTopics() {
      return !this.hasSearchCriteria;
    },
    sort_options() {
      return "sort_by=" + this.sort_by + "&sort_dir=" + this.sort_dir;
    }
  },
  created() {
    eventHub.$on("changeOrder", this.sortChanged);
  },
  mounted() {
    const vm = this;
    this.loadCategories(function(err, data) {
      if (err) {
        console.log("Error loading categories");
        vm.loadingTopics = false;
        return;
      }
      console.log("Categories loaded");
      console.log(data);
      vm.topics = data;
      vm.loadingTopics = false;
    });
  },
  methods: {
    sortChanged(opts) {
      const vm = this;
      vm.error = false;
      vm.loading = true;
      vm.sort_by = opts.sort_by;
      vm.sort_dir = opts.sort_dir;
      vm.filter(function(err, data) {
        vm.loading = false;
        if (err != null) {
          vm.error = true;
        }
        if (data) {
          console.log("Should show");
          console.log(data);
          vm.searchResults = data.objects;
        }
      });
    },
    loadCategories(cb) {
      this.$http
        .get("https://forms.fabfoundation.org/api/v1/category")
        .then(function(response) {
          cb(null, response.data.objects);
        })
        .catch(function(err) {
          cb(err);
        });
    },
    filter(cb) {
      // setTimeout(function() {
      //   cb();
      // }, 1000);
      self.searchResults = [];

      if (this.currentTopic) {
        // search by topic
        this.$http
          .get(
            "https://forms.fabfoundation.org/api/v1/article/search/?category=" +
              this.currentTopic.slug
          )
          .then(function(response) {
            cb(null, response.data);
          })
          .catch(function(error) {
            return cb(error);
          });
      }
      if (this.keywords) {
        this.$http
          .get(
            "https://forms.fabfoundation.org/api/v1/article/search/?" +
              this.sort_options +
              "&" +
              "q=" +
              this.keywords +
              "&region=" +
              this.region.slug
          )
          .then(function(response) {
            cb(null, response.data);
          })
          .catch(function(error) {
            return cb(error);
          });
      }
    },
    resetFilter() {
      this.currentTopic = null;
      this.keywords = null;
      this.region = null;
      this.loading = false;
    },
    selectTopic(topic) {
      this.resetFilter();
      this.currentTopic = topic;
      this.loading = true;
      const vm = this;
      this.filter(function(err, data) {
        vm.loading = false;
        vm.error = false;
        if (err != null) {
          vm.error = true;
        }
        if (data) {
          console.log("Should show");
          console.log(data);
          vm.searchResults = data.objects;
        }
      });
    },
    searchSubmit(e) {
      const vm = this;
      console.log("Search submitted");
      this.$nextTick(function() {
        console.log(vm);
        this.resetFilter();
        vm.keywords = e.text;
        vm.region = e.region;
        vm.error = false;
        vm.loading = true;

        vm.filter(function(err, data) {
          vm.loading = false;
          if (err != null) {
            vm.error = true;
          }
          if (data) {
            console.log("Should show");
            console.log(data);
            vm.searchResults = data.objects;
          }
        });
      });
    }
  }
});
