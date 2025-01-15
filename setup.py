from os.path import isdir, join
from platform import system

from setuptools import Extension, find_packages, setup
from setuptools.command.build import build
from setuptools.command.egg_info import egg_info
from wheel.bdist_wheel import bdist_wheel


class Build(build):
    def run(self):
        if isdir("queries"):
            dest = join(self.build_lib, "tree_sitter_plsql", "queries")
            self.copy_tree("queries", dest)
        super().run()


class BdistWheel(bdist_wheel):
    def get_tag(self):
        python, abi, platform = super().get_tag()
        if python.startswith("cp"):
            python, abi = "cp38", "abi3"
        return python, abi, platform


class EggInfo(egg_info):
    def find_sources(self):
        super().find_sources()
        self.filelist.recursive_include("queries", "*.scm")
        self.filelist.include("src/tree_sitter/*.h")


setup(
    packages=find_packages("bindings/python"),
    package_dir={"": "bindings/python"},
    package_data={
        "tree_sitter_plsql": ["*.pyi", "py.typed"],
        "tree_sitter_plsql.queries": ["*.scm"],
    },
    ext_package="tree_sitter_plsql",
    ext_modules=[
        Extension(
            name="_binding",
            sources=[
                "bindings/python/tree_sitter_plsql/binding.c",
                "src/parser.c",
                # NOTE: if your language uses an external scanner, add it here.
            ],
            extra_compile_args=[
                "-std=c11",
            ] if system() != "Windows" else [
                "/std:c11",
                "/utf-8",
            ],
            define_macros=[
                ("Py_LIMITED_API", "0x03080000"),
                ("PY_SSIZE_T_CLEAN", None)
            ],
            include_dirs=["src"],
            py_limited_api=True,
        )
    ],
    cmdclass={
        "build": Build,
        "bdist_wheel": BdistWheel,
        "egg_info": EggInfo,
    },
    zip_safe=False
)
