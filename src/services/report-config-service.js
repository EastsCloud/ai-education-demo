export function getRoleReportConfig({ role, roleReportConfigurations }) {
  return (
    roleReportConfigurations.find((configuration) => configuration.role === role) ||
    roleReportConfigurations.find((configuration) => configuration.role === "student")
  );
}

export function summarizeRoleReportConfigs(roleReportConfigurations) {
  return roleReportConfigurations.map((configuration) => ({
    role: configuration.role,
    visibleCount: configuration.visibleModules.length,
    firstScreenMetricLimit: configuration.firstScreenMetricLimit,
    protects: configuration.hiddenModules.join(" / "),
  }));
}

export function createReportConfigRuntime(roleReportConfigurations) {
  let activeRole = "parent";
  let configs = roleReportConfigurations.map((configuration) => ({
    ...configuration,
    visibleModules: [...configuration.visibleModules],
    hiddenModules: [...configuration.hiddenModules],
  }));

  function getActiveConfig() {
    return getRoleReportConfig({ role: activeRole, roleReportConfigurations: configs });
  }

  function setActiveRole(role) {
    activeRole = role;
    return getActiveConfig();
  }

  function toggleModule(moduleId) {
    configs = configs.map((configuration) => {
      if (configuration.role !== activeRole) return configuration;
      const visible = new Set(configuration.visibleModules);
      if (visible.has(moduleId)) {
        visible.delete(moduleId);
      } else {
        visible.add(moduleId);
      }
      return {
        ...configuration,
        visibleModules: Array.from(visible),
      };
    });
    return getActiveConfig();
  }

  function getSnapshot() {
    return {
      activeRole,
      activeConfig: getActiveConfig(),
      configs,
    };
  }

  return {
    getSnapshot,
    setActiveRole,
    toggleModule,
  };
}
