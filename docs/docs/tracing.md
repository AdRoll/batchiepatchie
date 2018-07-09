Batchiepatchie - Tracing
------------------------

Batchiepatchie supports tracing of many synchronization and API calls. This can
create a profile where the time of different operations can be put on a
histogram and in general get insight what parts of batchiepatchie are taking
large amounts of time. This is useful in debugging batchiepatchie itself.

The implementation right now only supports DataDog. The feature can be enabled
by adding `use_datadog_tracing = true` in the configuration file.

Even though DataDog is the only supported tracing target right now; most of the
tracing code has been implemented in terms of [Go opentracing library](https://github.com/opentracing/opentracing-go).
If you wish to use an alternative, you can modify `batchiepatchie.go` file in the
repository and modify it to instantiate opentracing handle with some other way.
