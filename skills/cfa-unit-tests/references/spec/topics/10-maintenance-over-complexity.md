## Maintenance over Complexity

When an architectural choice adds code without making ownership, behaviour,
testing, or maintenance clearer, reject it. If a feature is divided
across several additional managers or layers, question what the increased
complexity genuinely provides. Continue only when its benefits outweigh its
maintenance cost.

The code is not merely editable. In a commercial application, a team of four or
more engineers may change it every working day for 48 weeks of the year. The
primary objective is to build the desired service. The secondary objective is
to ensure that the team can maintain that service easily throughout its life.

