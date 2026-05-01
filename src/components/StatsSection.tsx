export function StatsSection() {
  const stats = [
    {
      number: "4,000+",
      label: "Templates",
      description: "Ready-to-use automation workflows"
    },
    {
      number: "500+",
      label: "Nodes",
      description: "Powerful nodes for building workflows"
    },
    {
      number: "100+",
      label: "AI Generated Templates",
      description: "Smart templates created by AI"
    }
  ];

  return (
    <section className="w-full px-6 py-16 bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 text-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4 text-white">
            Trusted by Thousands
          </h2>
          <p className="text-lg text-white/90 max-w-2xl mx-auto leading-relaxed">
            Join the growing community of developers and businesses using N8N Bazar to streamline their 
            automation workflows.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-4xl lg:text-5xl font-bold mb-3 text-white">
                {stat.number}
              </div>
              <div className="text-lg font-semibold text-white mb-2">
                {stat.label}
              </div>
              <div className="text-sm text-white/80 leading-relaxed">
                {stat.description}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}